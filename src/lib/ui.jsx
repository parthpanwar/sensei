import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Lenis from 'lenis'

/* ---------- smooth scroll (Lenis) ---------- */
let lenis = null
export function startLenis() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}
  lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true })
  let id = 0
  const loop = (t) => { lenis && lenis.raf(t); id = requestAnimationFrame(loop) }
  id = requestAnimationFrame(loop)
  return () => { cancelAnimationFrame(id); lenis && lenis.destroy(); lenis = null }
}
export function scrollToEl(target, opts = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target
  if (!el) return
  if (lenis) lenis.scrollTo(el, { offset: opts.offset ?? -72, duration: opts.duration ?? 1.2 })
  else el.scrollIntoView({ behavior: 'auto', block: opts.block || 'start' })
}
export function scrollTop() {
  if (lenis) lenis.scrollTo(0, { duration: 1.2 })
  else window.scrollTo(0, 0)
}

/* ---------- animated number ---------- */
export function Tick({ value, format = (n) => Math.round(n).toString(), duration = 700 }) {
  const reduce = useReducedMotion()
  const [v, setV] = useState(value)
  const cur = useRef(value)
  useEffect(() => {
    if (reduce || !isFinite(value) || !isFinite(cur.current)) { cur.current = value; setV(value); return }
    const from = cur.current, t0 = performance.now()
    let raf = 0
    const step = (now) => {
      const k = Math.min(1, (now - t0) / duration), e = 1 - Math.pow(1 - k, 4)
      cur.current = from + (value - from) * e
      setV(cur.current)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, duration, reduce])
  return <>{format(v)}</>
}

/* ---------- scroll reveal ---------- */
export function Reveal({ children, delay = 0, y = 28, as = 'div', className, style, amount = 0.15 }) {
  const reduce = useReducedMotion()
  const Tag = motion[as] || motion.div
  return (
    <Tag
      className={className}
      style={style}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Tag>
  )
}

export function Head({ eyebrow, title, lede }) {
  return (
    <div className="head">
      <Reveal><div className="eyebrow">{eyebrow}</div></Reveal>
      <Reveal delay={0.06}><h2>{title}</h2></Reveal>
      <Reveal delay={0.12}><p className="lede">{lede}</p></Reveal>
    </div>
  )
}

export const spring = { type: 'spring', stiffness: 260, damping: 28, mass: 0.8 }
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ---------- theme (system by default, explicit choice remembered) ---------- */
const root = () => document.documentElement
export function useTheme() {
  const systemLight = () => matchMedia('(prefers-color-scheme: light)').matches
  const [theme, setTheme] = useState(() => {
    const a = root().getAttribute('data-theme')
    if (a === 'light' || a === 'dark') return a
    try {
      const v = localStorage.getItem('hm-theme')
      if (v === 'light' || v === 'dark') { root().setAttribute('data-theme', v); return v }
    } catch (e) { /* storage unavailable */ }
    return systemLight() ? 'light' : 'dark'
  })
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: light)')
    const on = () => { if (!root().getAttribute('data-theme')) setTheme(mq.matches ? 'light' : 'dark') }
    mq.addEventListener && mq.addEventListener('change', on)
    return () => mq.removeEventListener && mq.removeEventListener('change', on)
  }, [])
  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    root().classList.add('theming')
    root().setAttribute('data-theme', next)
    try { localStorage.setItem('hm-theme', next) } catch (e) { /* ignore */ }
    setTheme(next)
    setTimeout(() => root().classList.remove('theming'), 650)
  }
  return [theme, toggle]
}
