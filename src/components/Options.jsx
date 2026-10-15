import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { IsoScene } from '../lib/iso.jsx'
import { COL } from '../lib/model.js'
import { Head, Reveal } from '../lib/ui.jsx'
import Chip from './Chip.jsx'
import { LABS } from './Labs.jsx'

const ICON = {
  savings: { u: 11, b: [0, 0.5, 1].map((z) => ({ x: 0, y: 0, z, w: 2, d: 2, h: 0.4, c: COL.blue })) },
  fd: { u: 11, b: [{ x: 0, y: 0, z: 0, w: 2, d: 2, h: 2, c: COL.blue }, { x: 0.55, y: 2, z: 0.35, w: 0.9, d: 0.12, h: 1.1, c: COL.grey }] },
  bonds: { u: 11, b: [0, 0.5, 1, 1.5].map((z, i) => ({ x: 0, y: 0, z, w: 2.4, d: 1.6, h: 0.4, c: i % 2 ? COL.grey : COL.blue })) },
  gold: { u: 11, b: [{ x: 0, y: 0, z: 0, w: 3, d: 2, h: 0.7, c: COL.gold }, { x: 0.5, y: 0.3, z: 0.7, w: 2, d: 1.4, h: 0.7, c: COL.gold }, { x: 1, y: 0.6, z: 1.4, w: 1, d: 0.8, h: 0.6, c: COL.gold }] },
  index: { u: 9, b: [1, 1.6, 2.3, 3.1].map((h, i) => ({ x: i * 1.25, y: 0, z: 0, w: 1, d: 1, h, c: COL.green })) },
  stocks: { u: 9, b: [[2.8, COL.red], [0.8, COL.gold], [3.3, COL.red], [0.4, COL.gold]].map((a, i) => ({ x: i * 1.25, y: 0, z: 0, w: 1, d: 1, h: a[0], c: a[1] })) },
}
const SIP = [0, 1, 2, 3].map((i) => ({ x: i * 1.1, y: 0, z: 0, w: 1, d: 1, h: 0.5 + i * 0.45, c: COL.green }))

const OPTS = [
  { id: 'savings', name: 'Savings account', tag: 'cushion', fit: false, what: 'Money in your bank that earns a little interest.', risk: 1, lock: 'None', cost: 'None', yr: '2.5% to 3.5%', worst: '0%. It does not fall.', plain: 'Think of it as a wallet that pays you a bit. You can take it out any day.', good: 'One month of costs as a cushion, so you never sell an investment in a hurry.', watch: 'Prices rise about 5% a year. Cash here slowly buys less.' },
  { id: 'fd', name: 'Fixed deposit', tag: 'fits', fit: true, what: 'You lend the bank a sum for a fixed time at a fixed rate.', risk: 1, lock: '1 to 5 years', cost: 'Penalty if you leave early', yr: '6% to 7.5%', worst: '0%. The rate is agreed upfront.', plain: 'You know the exact amount you get back and when. Nothing surprises you.', good: 'Money you need within 3 years. It is the calm part of your mix.', watch: 'Interest is taxed at your slab. Growth is slow, so it will not reach a big goal alone.' },
  { id: 'bonds', name: 'Bonds and debt funds', tag: 'later', fit: false, what: 'Loans to companies or the government, packaged into a fund.', risk: 2, lock: 'None to 3 years', cost: '0.3% to 1% a year', yr: '6.5% to 8%', worst: 'Around -5% when interest rates jump.', plain: 'Similar job to a fixed deposit, a little more return, a little more wobble.', good: 'Once your mix is large enough that a deposit feels limiting.', watch: 'Hard to compare funds at first. Skip for now; the Steady bucket uses gold for this.' },
  { id: 'gold', name: 'Gold', tag: 'fits', fit: true, what: 'Digital gold or a gold fund that tracks the metal price.', risk: 3, lock: 'None', cost: '0.5% to 1% a year', yr: '8% to 11% over long runs', worst: 'Around -15% to -20%.', plain: 'It tends to hold up when other things fall, though it can sit flat for years.', good: 'A small slice that cushions bad stock years.', watch: 'Pays no interest. All of the return comes from the price moving.' },
  { id: 'index', name: 'Index fund', tag: 'fits', fit: true, what: 'One fund that holds the biggest companies, like the Nifty 50.', risk: 4, lock: 'None', cost: '0.1% to 0.5% a year', yr: '10% to 13% over 10+ years', worst: 'Around -38% in 2020 and -52% in 2008.', plain: 'You own a thin slice of the whole market. When India grows, you grow. When it panics, you drop with it, then usually come back.', good: 'Money you will not touch for 7 years or more. This is what builds a large number.', watch: 'Some years lose money, and a few lose a lot. Selling in a fall locks the loss in.' },
  { id: 'stocks', name: 'Single stocks', tag: 'skip', fit: false, what: 'Shares of one company.', risk: 5, lock: 'None', cost: 'Brokerage and tax on each trade', yr: 'Anything from -100% to +300%', worst: 'Can lose half or all of it.', plain: 'One company can fail even when the market is fine.', good: 'Money you can afford to lose, once you have read company accounts.', watch: 'Friends and reels favour the winners. You do not hear about the losers.' },
]

const DEEP = {
  savings: {
    steps: ['You deposit money in a normal bank account.', 'The bank pays 2.5% to 3.5% a year on what sits there.', 'You can withdraw any day, with no penalty.'],
    when: ['You want a cushion of one to two months of costs.', 'You need the money within a year.', 'You are saving for something with a date, like a phone or fees.'],
    rule: ['Keep a cushion of about ', '₹16,000', ' here. Once it is full, send every extra rupee to your plan.'],
  },
  bonds: {
    steps: ['A fund lends money to companies or the government.', 'It collects interest, which shows up as a rising fund price.', 'If interest rates rise, the price dips. If they fall, it rises.'],
    when: ['Your portfolio is above about ₹2 lakh.', 'You can hold for at least 3 years.', 'You can read the fund sheet: average maturity and credit quality.'],
    rule: ['Look for an average maturity near ', '3 years', '. Skip funds that chase high yield from weak companies.'],
  },
  stocks: {
    steps: ['You buy shares of one company.', 'The price moves with profits, news and mood.', 'If the company fails, the shares can go to zero.'],
    when: ['Your plan already runs on autopilot for a year or more.', 'You can read a balance sheet.', 'The money is play money you can lose.'],
    rule: ['Cap single stocks at ', '5% of your plan', ', and never fund them from your cushion.'],
  },
}

const Pips = ({ n, cls }) => (
  <span className={'pips ' + cls}>{[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= n ? 'on' : ''} />)}</span>
)

export default function Options() {
  const [sel, setSel] = useState('index')
  const [all, setAll] = useState(false)
  const o = OPTS.find((x) => x.id === sel)
  return (
    <section className="s" id="options">
      <Head eyebrow="01 · Make sense of it" title="Six places to put money. Three fit you." lede="Each card shows what it is, how much it can move, and what a market fall looks like. Tap one to read it in plain words." />
      <Reveal>
        <div className="opt-tools">
          <div className="row" role="group" aria-label="Filter options">
            <Chip group="filter" on={!all} onClick={() => setAll(false)}>Fit me</Chip>
            <Chip group="filter" on={all} onClick={() => setAll(true)}>Show all six</Chip>
          </div>
          <span className="soft" style={{ fontSize: 13 }}>At ₹8,000 a month, age 19, first time investing.</span>
        </div>
      </Reveal>
      <div className="opt-grid">
        {OPTS.map((x, i) => (
          <Reveal key={x.id} delay={(i % 3) * 0.08}>
          <motion.button className="opt" aria-pressed={x.id === sel} onClick={() => setSel(x.id)}
            animate={{ opacity: !all && !x.fit && x.id !== sel ? 0.38 : 1 }} transition={{ duration: 0.4 }}
            whileHover={{ y: -4 }} whileTap={{ scale: 0.985 }}>
            <span className={'tag ' + (x.fit ? 'on' : '')}>{x.tag}</span>
            <span className="ico"><IsoScene blocks={ICON[x.id].b} u={ICON[x.id].u} tween={false} aria-hidden="true" /></span>
            <h3>{x.name}</h3>
            <p>{x.what}</p>
            <span className="meters">
              <span className="meter"><span>Swings</span><Pips n={x.risk} cls={x.risk >= 4 ? 'hot' : x.risk >= 3 ? 'warm' : ''} /></span>
              <span className="meter"><span>Locked in</span><span style={{ color: 'var(--text)' }}>{x.lock}</span></span>
              <span className="meter"><span>In a fall</span><span style={{ color: 'var(--text)' }}>{x.worst.split('.')[0]}</span></span>
            </span>
            {DEEP[x.id] && <span className="try">{x.id === sel ? 'Open below ↓' : 'Try it →'}</span>}
          </motion.button>
          </Reveal>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={sel} className="detail" aria-live="polite" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28 }}>
          <div className="big"><strong>{o.name}</strong><span className="soft">Usual return {o.yr}</span><span className="soft">Cost {o.cost}</span></div>
          <div><h4>In plain words</h4><p>{o.plain}</p></div>
          <div><h4>Good for</h4><p>{o.good}</p></div>
          <div><h4>Watch out</h4><p>{o.watch}</p></div>
        </motion.div>
      </AnimatePresence>
      <AnimatePresence mode="wait" initial={false}>
        {DEEP[sel] && (() => {
          const d = DEEP[sel], Lab = LABS[sel]
          return (
            <motion.div key={sel} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.32 }}>
              <div className="deep">
                <div><h4>How it works</h4><ol>{d.steps.map((t) => <li key={t}>{t}</li>)}</ol></div>
                <div><h4>It becomes useful when</h4><ul>{d.when.map((t) => <li key={t}>{t}</li>)}</ul></div>
                <div className="rule">{d.rule[0]}<b>{d.rule[1]}</b>{d.rule[2]}</div>
              </div>
              <Lab />
            </motion.div>
          )
        })()}
      </AnimatePresence>
      <Reveal>
        <div className="callout">
          <IsoScene blocks={SIP} u={9} tween={false} aria-hidden="true" />
          <p><b>SIP is a habit, not a product.</b> A SIP (systematic investment plan) moves a fixed amount from your bank into a fund on the same date each month. You can run one into an index fund, gold or a debt fund. That is the engine of your plan below.</p>
        </div>
      </Reveal>
    </section>
  )
}
