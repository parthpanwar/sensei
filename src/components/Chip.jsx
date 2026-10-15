import { motion } from 'framer-motion'
import { spring } from '../lib/ui.jsx'

export default function Chip({ on, onClick, children, group }) {
  return (
    <button className="chip" aria-pressed={on} onClick={onClick}>
      {on && <motion.span layoutId={'chip-' + group} className="chip-bg" transition={spring} />}
      <span className="t">{children}</span>
    </button>
  )
}
