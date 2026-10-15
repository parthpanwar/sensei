import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { clamp } from '../lib/model.js'
import { scrollToEl, scrollTop, sleep } from '../lib/ui.jsx'

const STOPS = [
  { sel: '#heroLive', top: true, txt: 'This line updates as you change anything below.' },
  { sel: '.opt-grid', txt: 'Six options in plain words. Three fit you.' },
  { sel: '#plan .plan .panel', point: '#mixLab', txt: 'Move a slider here. The date changes instantly.' },
  { sel: '#hold .scene', txt: 'One tower. The gold outline is where the plan expected you.' },
  { sel: '#badyear .by-top', point: '#badyear .by-top .btn', txt: 'Last stop. Play a market fall, then decide what to do.' },
]
const CAP = 88 // room kept clear at the bottom for the caption
const headH = () => (document.querySelector('.top')?.getBoundingClientRect().height || 70)
const sp = { type: 'spring', stiffness: 90, damping: 18, mass: 0.9 }

export default function Tour({ ready, replay }) {
  const [offer, setOffer] = useState(false)
  const [cur, setCur] = useState(null)
  const [step, setStep] = useState(0)
  const live = useRef(false)

  useEffect(() => {
    if (!ready) return
    const t = setTimeout(() => setOffer(true), 2200)
    return () => clearTimeout(t)
  }, [ready])

  const end = () => { live.current = false; setCur(null); setOffer(false); document.querySelectorAll('.hl').forEach((e) => e.classList.remove('hl')) }
  const run = async () => {
    live.current = true; setOffer(false)
    setCur({ x: innerWidth / 2, y: innerHeight / 2, txt: '', show: true })
    for (let i = 0; i < STOPS.length; i++) {
      const s = STOPS[i]
      if (!live.current) return
      const el = document.querySelector(s.sel)
      if (!el) continue
      // park the target fully inside the free area: below the header, above the caption
      const hh = headH(), free = innerHeight - hh - CAP - 24, h = el.getBoundingClientRect().height
      const top = h >= free ? hh + 40 : hh + 40 + Math.max(0, free - h - 24) / 2
      if (s.top) scrollTop(); else scrollToEl(el, { offset: -top, duration: 1.1 })
      await sleep(1500)
      if (!live.current) return
      el.classList.add('hl')
      const pt = (s.point && document.querySelector(s.point)) || el
      const r = pt.getBoundingClientRect(), R = el.getBoundingClientRect()
      const x = clamp(s.point ? r.left + 70 : Math.min(r.right, R.right) - 36, 20, innerWidth - 50)
      const y = clamp(r.top + Math.min(r.height / 2, 60), hh + 12, innerHeight - CAP - 10)
      setStep(i + 1)
      // bubble: below the block if it fits, else above it, else pinned near the bottom
      const BH = 92
      let by = R.bottom + 14
      if (by + BH > innerHeight - 12) by = R.top - BH - 14 > hh + 8 ? R.top - BH - 14 : innerHeight - BH - 16
      setCur({ x, y, bx: clamp(x - 30, 12, innerWidth - 292), by, txt: s.txt, show: true })
      await sleep(3400)
      el.classList.remove('hl')
    }
    end()
  }
  useEffect(() => { if (replay > 0) { window.scrollTo({ top: 0 }); setTimeout(run, 300) } }, [replay]) // eslint-disable-line
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape' && live.current) end() }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [])

  return (
    <>
      <AnimatePresence>
        {offer && (
          <motion.div className="tour" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
            <div className="tour-in">
              <div><b>Want me to show you around?</b><span>About 40 seconds. I move my own cursor, so yours stays free.</span></div>
              <div className="row" style={{ flex: '0 0 auto' }}>
                <button className="btn sm" onClick={() => setOffer(false)}>I'll look myself</button>
                <button className="btn sm primary" onClick={run}>Show me</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {cur && (
          <>
            <motion.div key="cur" className="gcur" aria-hidden="true" initial={{ opacity: 0, x: cur.x, y: cur.y }} animate={{ opacity: 1, x: cur.x, y: cur.y }} exit={{ opacity: 0 }} transition={sp}>
              <svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l15 9-6.5 1.8L9 19z" fill="#4a8cff" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" /></svg>
            </motion.div>
            {cur.txt && (
              <motion.div key={cur.txt} className="gbub" aria-hidden="true" initial={{ opacity: 0, x: cur.bx, y: cur.by + 10 }}
                animate={{ opacity: 1, x: cur.bx, y: cur.by }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
                {cur.txt}
                <small>{step} / {STOPS.length} · Esc to skip</small>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </>
  )
}
