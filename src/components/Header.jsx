import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion'
import { IsoScene } from '../lib/iso.jsx'
import { COL } from '../lib/model.js'
import { scrollToEl, scrollTop, spring, useTheme } from '../lib/ui.jsx'

const NAV = [['options', 'Options'], ['plan', 'Plan'], ['hold', 'Hold'], ['badyear', 'Market fall']]
const LOGO = [
  { x: 0, y: 0, z: 0, w: 1, d: 1, h: 0.5, c: COL.blue },
  { x: 0, y: 0, z: 0.5, w: 1, d: 1, h: 0.5, c: COL.green },
  { x: 0, y: 0, z: 1, w: 1, d: 1, h: 0.5, c: COL.white },
]

export default function Header() {
  const [active, setActive] = useState('')
  const [theme, toggleTheme] = useTheme()
  const { scrollYProgress } = useScroll()
  const sx = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 })

  useEffect(() => {
    const els = NAV.map(([id]) => document.getElementById(id)).filter(Boolean)
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) setActive(e.target.id) }),
      { rootMargin: '-40% 0px -55% 0px' }
    )
    els.forEach((el) => io.observe(el))
    const onTop = () => { if (window.scrollY < 200) setActive('') }
    window.addEventListener('scroll', onTop, { passive: true })
    return () => { io.disconnect(); window.removeEventListener('scroll', onTop) }
  }, [])

  return (
    <header className="top">
      <div className="wrap">
        <a className="brand" href="#top" aria-label="Sensei" onClick={(e) => { e.preventDefault(); scrollTop() }}>
          <IsoScene blocks={LOGO} u={14} tween={false} width="34" height="34" aria-hidden="true" />
          <span>sensei</span>
        </a>
        <nav className="nav" aria-label="Sections">
          {NAV.map(([id, label]) => (
            <a key={id} href={'#' + id} className={active === id ? 'on' : ''} onClick={(e) => { e.preventDefault(); scrollToEl('#' + id) }}>
              {label}
              {active === id && <motion.span layoutId="navul" className="ul" transition={spring} />}
            </a>
          ))}
        </nav>
        <button className="btn sm themebtn" onClick={toggleTheme} aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={theme} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
              {theme === 'light'
                ? <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5z" fill="currentColor" /></svg>
                : <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3" fill="currentColor" /><g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" /></g></svg>}
              {theme === 'light' ? 'Dark' : 'Light'}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>
      <motion.div className="progress" style={{ scaleX: sx }} />
    </header>
  )
}
