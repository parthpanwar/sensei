import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { DEFAULT_PLAN, GOALS, simulate } from './lib/model.js'
import { startLenis } from './lib/ui.jsx'
import Boot from './components/Boot.jsx'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import Options from './components/Options.jsx'
import Plan from './components/Plan.jsx'
import Hold from './components/Hold.jsx'
import BadYear from './components/BadYear.jsx'
import Tour from './components/Tour.jsx'

export default function App() {
  const [S, setS] = useState(DEFAULT_PLAN)
  const dS = useDeferredValue(S)
  const [booted, setBooted] = useState(false)
  const [replay, setReplay] = useState(0)
  const done = useCallback(() => setBooted(true), [])
  useEffect(() => startLenis(), [])
  const key = JSON.stringify(dS)
  const r = useMemo(() => simulate(dS, GOALS[dS.goal].v, dS.real), [key]) // eslint-disable-line

  return (
    <>
      <AnimatePresence>{!booted && <Boot onDone={done} />}</AnimatePresence>
      <Header />
      <main className="wrap" id="top">
        <Hero S={dS} r={r} booted={booted} />
        <Options />
        <Plan S={S} setS={setS} dS={dS} />
        <Hold S={dS} />
        <BadYear S={dS} />
        <footer>
          <p>Simulated numbers for learning. Returns are assumptions: fixed deposit 6.5%, gold and bonds 8.5%, index fund 12% a year, with realistic ups and downs. Real results vary. This is not investment advice.</p>
          <div className="row"><button className="btn sm" onClick={() => setReplay((n) => n + 1)}>Replay the tour</button></div>
        </footer>
      </main>
      <Tour ready={booted} replay={replay} />
    </>
  )
}
