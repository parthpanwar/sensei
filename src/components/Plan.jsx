import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { IsoScene, bbox } from '../lib/iso.jsx'
import { ASSETS, COL, DEFL, GOALS, PRESETS, Phi, clamp, dateOf, dur, expPath, fmt, mixStats, setMix, shiftMix, simulate } from '../lib/model.js'
import { Head, Reveal, Tick, spring } from '../lib/ui.jsx'
import Chip from './Chip.jsx'
import Range from './Range.jsx'

const planOf = (S, o) => ({ ...S, ...o })

function compute(S) {
  const g = GOALS[S.goal].v
  const r = simulate(S, g, S.real)
  const ladder = GOALS.map((gl, i) => (i === S.goal ? r : simulate(S, gl.v, S.real)))
  const st = mixStats(S.w)
  const variants = [
    { t: 'Add ₹1,000 a month', p: planOf(S, { monthly: S.monthly + 1000 }) },
    { t: 'Raise it 2% more each year', p: planOf(S, { step: Math.min(20, S.step + 2) }) },
    { t: 'Shift 10 points to Growth', p: planOf(S, { w: shiftMix(S.w, 10) }), mix: true },
  ].map((v) => {
    const rr = simulate(v.p, g, S.real)
    let kind, text = ''
    if (!isFinite(r.p50) && !isFinite(rr.p50)) kind = 'same-out'
    else if (!isFinite(r.p50)) kind = 'within'
    else { const d = r.p50 - rr.p50; if (d > 0) { kind = 'up'; text = dur(d) + ' sooner' } else if (d < 0) { kind = 'dn'; text = dur(-d) + ' later' } else kind = 'none' }
    let extra = ''
    if (v.mix) {
      const s2 = mixStats(v.p.w)
      extra = `Fall risk moves from ${Math.round((st.mu - 1.645 * st.sd) * 100)}% to ${Math.round((s2.mu - 1.645 * s2.sd) * 100)}%`
    }
    return { t: v.t, kind, text, extra }
  })
  const pn = Phi(-st.mu / st.sd)
  const yrsN = pn > 0.005 ? Math.round(1 / pn) : 0
  const worst = st.mu - 1.645 * st.sd
  const crash = Math.round(S.w[2] * 0.38 + S.w[1] * 0.095)
  return { r, ladder, variants, pn, yrsN, worst, crash }
}

function planScene(S, r) {
  const end = isFinite(r.p50) ? r.p50 : 600
  const path = expPath(S, Math.max(24, end))
  const yrs = Math.max(2, Math.ceil(end / 12)), stepY = Math.max(1, Math.ceil(yrs / 9))
  const marks = []
  for (let y = stepY; y < yrs; y += stepY) marks.push(y * 12)
  marks.push(end)
  const u = 15, H = 8, g = GOALS[S.goal].v, blocks = [], GAP = 1.8, CWD = 1.1, CD = 1.4
  const val = (m) => (S.real ? path.V[m] / DEFL[m] : path.V[m])
  // the average-return path hits the goal sooner than the simulated middle result, so rescale it to land exactly on the goal at the shown date
  const k = isFinite(r.p50) && val(end) > 0 ? g / val(end) : 1
  marks.forEach((m, i) => {
    const v = val(m) * k
    const h = clamp(v / g, 0, 1.25) * H
    let z = 0
    S.w.forEach((wp, k) => {
      const sh = (h * wp) / 100
      blocks.push({ key: `c${i}s${k}`, x: i * GAP, y: 0, z, w: CWD, d: CD, h: Math.max(sh, 0.001), c: ASSETS[k].c, op: sh > 0.015 ? 1 : 0 })
      z += sh
    })
  })
  const lx = (marks.length - 1) * GAP
  blocks.push({ key: 'goal', x: lx - 0.3, y: -0.3, z: H, w: CWD + 0.6, d: CD + 0.6, h: 0, wire: true, flat: true, stroke: 'var(--blue)', op: 1.1 })
  const labels = [
    { key: 'goal', x: lx + CWD + 0.3, y: -0.3, z: H, dx: 12, dy: 4, t: 'goal ' + GOALS[S.goal].label, fill: 'var(--text)' },
    { key: 'now', x: CWD, y: CD, z: 0, t: 'now', anchor: 'middle', dy: 18 },
    { key: 'end', x: lx + CWD, y: CD, z: 0, t: dateOf(end).split(' ')[1] || '', anchor: 'middle', dy: 18 },
  ]
  return { blocks, labels, u, vb: bbox(blocks, u, labels) }
}

export default function Plan({ S, setS, dS }) {
  const key = JSON.stringify(dS)
  const c = useMemo(() => compute(dS), [key]) // eslint-disable-line
  const sc = useMemo(() => planScene(dS, c.r), [key, c.r]) // eslint-disable-line
  const { r } = c
  const g = GOALS[S.goal]
  const set = (o) => setS((s) => ({ ...s, ...o }))
  const date = isFinite(r.p50) ? dateOf(r.p50) : 'Not in 50 years'
  const stale = key !== JSON.stringify(S)

  return (
    <section className="s" id="plan">
      <Head eyebrow="02 · Narrow to a plan" title="Move a slider. Watch the date move." lede="Each run plays out 300 possible futures. You see the middle one, plus how early or late it could land." />
      <div className="plan">
        <div>
          <Reveal className="panel">
            <div className="ctl">
              <span className="lab" id="goalLab">What counts as a million?</span>
              <div className="row" role="group" aria-labelledby="goalLab">
                {GOALS.map((x, i) => <Chip key={x.label} group="goal" on={S.goal === i} onClick={() => set({ goal: i })}>{x.label}</Chip>)}
              </div>
            </div>
            <div className="ctl">
              <label htmlFor="monthly">Put in each month <output className="num">₹{fmt(S.monthly)}</output></label>
              <Range id="monthly" min={1000} max={30000} step={500} value={S.monthly} onChange={(v) => set({ monthly: v })} />
            </div>
            <div className="ctl">
              <label htmlFor="step">Raise it each year by <output className="num">{S.step}%</output></label>
              <Range id="step" min={0} max={15} step={1} value={S.step} onChange={(v) => set({ step: v })} />
            </div>
            <div className="ctl">
              <span className="lab" id="mixLab">Your mix</span>
              <div className="row" role="group" aria-labelledby="mixLab">
                {PRESETS.map(([n, w]) => <Chip key={n} group="preset" on={w.join() === S.w.join()} onClick={() => set({ w: w.slice() })}>{n}</Chip>)}
              </div>
              <div className="mix">
                <div className="mixbar" aria-hidden="true">
                  {S.w.map((v, i) => <motion.i key={i} style={{ background: ASSETS[i].css }} animate={{ flexGrow: v }} transition={spring} />)}
                </div>
                {[['Safe · fixed deposit', 0], ['Steady · gold + bonds', 1], ['Growth · index fund', 2]].map(([n, i]) => (
                  <div className="ctl" key={i}>
                    <label htmlFor={'mix' + i}><span><span className="sw-dot" style={{ background: ASSETS[i].css }} />{n}</span><output className="num">{S.w[i]}%</output></label>
                    <Range id={'mix' + i} min={0} max={100} step={5} value={S.w[i]} onChange={(v) => set({ w: setMix(S.w, i, v) })} />
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal className="panel" delay={0.05}>
            <label className="toggle">
              <input type="checkbox" checked={S.real} onChange={(e) => set({ real: e.target.checked })} />
              <span className="sw" /><span>Count in today's money (prices rise 5% a year)</span>
            </label>
          </Reveal>
        </div>
        <div className="stack">
          <Reveal className="panel result" delay={0.08}>
            <div aria-live="polite" style={{ opacity: stale ? 0.7 : 1, transition: 'opacity .2s' }}>
              <div className="soft" style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10 }}>Most likely you get there in</div>
              <div className="when num">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={date} initial={{ y: '60%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '-60%', opacity: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>{date}</motion.div>
                </AnimatePresence>
              </div>
              <div className="for">
                {isFinite(r.p50) ? `${dur(r.p50)} from now, to reach ${g.label}${dS.real ? " in today's money" : ''} (${g.sub}).` : `At this pace ${g.label} is out of reach. Raise the monthly amount or pick a smaller goal.`}
              </div>
              <div className="range">
                {isFinite(r.p50) && <>1 future in 10 gets there before <b>{dateOf(r.p10)}</b>. 1 in 10 takes until <b>{isFinite(r.p90) ? dateOf(r.p90) : 'after 50 years'}</b> or longer.</>}
              </div>
            </div>
            <div className="scene">
              <IsoScene blocks={sc.blocks} u={sc.u} vb={sc.vb} labels={sc.labels} role="img" aria-label="Isometric towers showing your money over the years, rising to the goal line." />
            </div>
            <p className="note">Each tower is a few years apart. Look at how little the early ones grow and how much the last ones do. That is compounding, and it is why starting at 19 matters.</p>
          </Reveal>
          <Reveal className="panel" delay={0.04}>
            <h3 className="mini">The same plan, three goals</h3>
            <div className="ladder">
              {GOALS.map((gl, i) => {
                const rr = c.ladder[i]
                const pct = isFinite(rr.p50) ? Math.min(100, (rr.p50 / 600) * 100) : 100
                return (
                  <button key={gl.label} className="rung" aria-pressed={S.goal === i} onClick={() => set({ goal: i })}>
                    <span><b style={{ fontWeight: 500 }}>{gl.label}</b><small>{gl.sub}</small></span>
                    <span className="bar"><motion.i initial={false} animate={{ width: pct + '%' }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} /></span>
                    <span className="num">{isFinite(rr.p50) ? dateOf(rr.p50) + ' · ' + dur(rr.p50) : '50+ yr'}</span>
                  </button>
                )
              })}
            </div>
          </Reveal>
          <Reveal className="panel" delay={0.04}>
            <h3 className="mini">What one change does</h3>
            <div className="deltas">
              {c.variants.map((v) => (
                <motion.div className="delta" key={v.t} layout>
                  <b>{v.t}</b>
                  {v.kind === 'up' && <span className="up">{v.text}</span>}
                  {v.kind === 'dn' && <span className="dn">{v.text}</span>}
                  {v.kind === 'none' && <span className="soft">No change</span>}
                  {v.kind === 'within' && <span className="up">Brings it within 50 years</span>}
                  {v.kind === 'same-out' && <span className="soft">Still out of reach</span>}
                  {v.extra && <small>{v.extra}</small>}
                </motion.div>
              ))}
            </div>
            <p className="note" style={{ marginTop: 18 }}>
              {c.pn > 0.02 ? <>This mix loses money in roughly <b>1 year out of {c.yrsN}</b>. </> : 'This mix rarely loses money in a single year, which is also why it is slower. '}
              {c.worst < 0 ? `1 year in 20 is worse than ${Math.round(c.worst * 100)}%. ` : ''}
              A 2020-style fall (Growth down 38%) would take about <Tick value={c.crash} />% off it.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
