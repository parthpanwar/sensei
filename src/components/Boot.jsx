import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { IsoScene } from '../lib/iso.jsx'
import { COL } from '../lib/model.js'

const LINES = [[0, 'sensei 1.0'], [0.3, 'building 300 possible futures'], [0.65, 'checking that some years lose money'], [1, 'ready']]
const W = 11, BD = 1.8, BH = 1.3, U = 24
const VB = [-(BD) * 0.866 * U - 4, -4, (W) * 0.866 * U + 4, (W + BD) * 0.5 * U + BH * U + 10]
const ease = (k) => 1 - Math.pow(1 - k, 3)

export default function Boot({ onDone }) {
  const reduce = useReducedMotion()
  const [p, setP] = useState(0)
  useEffect(() => {
    const T = reduce ? 300 : 2000
    const t0 = performance.now()
    let raf = 0, end = 0
    const step = (now) => {
      const k = Math.min(1, Math.max(0, (now - t0) / T))
      setP(ease(k))
      if (k < 1) raf = requestAnimationFrame(step)
      else end = setTimeout(onDone, 380)
    }
    raf = requestAnimationFrame(step)
    return () => { cancelAnimationFrame(raf); clearTimeout(end) }
  }, [onDone, reduce])

  const blocks = useMemo(() => {
        const w = W * p
    return [
      { key: 'fill', x: 0, y: 0, z: 0, w, d: BD, h: BH, c: COL.accent, edge: 'var(--ink)' },
      { key: 'rail', x: w, y: 0, z: 0, w: Math.max(0.001, W - w), d: BD, h: BH, c: COL.blue, op: 0.55, edge: 'var(--ink)' },
    ].filter((b) => b.w > 0.004)
  }, [p])
  const shown = LINES.filter(([at]) => p >= at)

  return (
    <motion.div className="boot" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}>
      <motion.div className="boot-in boot-bar" exit={{ opacity: 0, y: -30, scale: 1.12, filter: 'blur(6px)' }} transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}>
        <IsoScene blocks={blocks} u={U} vb={VB} tween={false} className="boot-svg" aria-hidden="true" />
        <div className="boot-meta">
          <span className="boot-log" aria-live="polite">{'> ' + shown[shown.length - 1][1]}</span>
          <span className="num boot-pct">{Math.round(p * 100)}%</span>
        </div>
      </motion.div>
      <button className="boot-skip" onClick={onDone}>Skip</button>
    </motion.div>
  )
}
