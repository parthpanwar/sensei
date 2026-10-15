import { useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

const CS = Math.cos(Math.PI / 6)
export const proj = (x, y, z, u) => [(x - y) * CS * u, (x + y) * 0.5 * u - z * u]
const ps = (pts) => pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')

export function faces(b, u) {
  const { x, y, z = 0, w = 1, d = 1, h = 1 } = b
  const P = (a, c, e) => proj(a, c, e, u)
  return {
    top: [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)],
    left: [P(x, y + d, z), P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z)],
    right: [P(x + w, y, z), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z)],
  }
}

export function bbox(blocks, u, labels = []) {
  let a = 1e9, b = 1e9, c = -1e9, d = -1e9
  const eat = (p) => { a = Math.min(a, p[0]); b = Math.min(b, p[1]); c = Math.max(c, p[0]); d = Math.max(d, p[1]) }
  blocks.forEach((k) => { const f = faces(k, u); [...f.top, ...f.left, ...f.right].forEach(eat) })
  labels.forEach((l) => {
    const p = proj(l.x, l.y, l.z, u)
    const px = p[0] + (l.dx || 0), py = p[1] + (l.dy || 0), w = l.t.length * 7
    eat([px, py - 12]); eat([px, py + 4])
    if (l.anchor === 'end') eat([px - w, py])
    else if (l.anchor === 'middle') { eat([px - w / 2, py]); eat([px + w / 2, py]) }
    else eat([px + w, py])
  })
  return [a, b, c, d]
}

function Prism({ b, u }) {
  const f = faces(b, u)
  if (b.wire) {
    return (
      <g fill="none" style={{ stroke: b.stroke || 'var(--ghost)' }} strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round" opacity={(b.op ?? 0.7) * 0.8}>
        {!b.flat && <polygon points={ps(f.left)} />}
        {!b.flat && <polygon points={ps(f.right)} />}
        <polygon points={ps(f.top)} />
      </g>
    )
  }
  const c = b.c
  const s = { stroke: b.noedge ? 'none' : (b.edge || 'var(--edge)'), strokeWidth: b.edge ? 1.05 : 0.7, strokeLinejoin: 'round' }
  return (
    <g opacity={b.op ?? 1}>
      <polygon points={ps(f.left)} style={{ ...s, fill: c.l }} />
      <polygon points={ps(f.right)} style={{ ...s, fill: c.r }} />
      <polygon points={ps(f.top)} style={{ ...s, fill: c.t }} />
    </g>
  )
}

const ease = (k) => 1 - Math.pow(1 - k, 3)
const NUMK = ['x', 'y', 'z', 'w', 'd', 'h', 'op']

/**
 * Isometric scene. With `tween` on, block geometry, labels and the viewBox glide
 * toward new values. New blocks grow up from the floor with their stack, and
 * removed blocks shrink away, so stacked segments never detach from each other.
 */
export function IsoScene({ blocks, u, vb, labels = [], className, tween = true, dur = 560, style, ...rest }) {
  const reduce = useReducedMotion()
  const box = vb || bbox(blocks, u, labels)
  const target = { blocks, labels, box }
  const sig = JSON.stringify([
    box.map((n) => Math.round(n * 10)),
    blocks.map((b) => [b.key, b.c?.t, b.wire, b.noedge, b.edge, ...NUMK.map((k) => b[k] ?? null)]),
    labels.map((l) => [l.key, l.t, l.x, l.y, l.z, l.dx, l.dy, l.fill]),
  ])
  const [disp, setDisp] = useState(target)
  const live = useRef(target)
  const latest = useRef(target)
  latest.current = target
  const raf = useRef(0)

  useEffect(() => {
    cancelAnimationFrame(raf.current)
    const tgt = latest.current
    if (!tween || reduce) { live.current = tgt; setDisp(tgt); return }
    const from = live.current
    const prevB = new Map(from.blocks.map((b, i) => [b.key ?? i, b]))
    const prevL = new Map(from.labels.map((l, i) => [l.key ?? i, l]))
    const tB = new Set(tgt.blocks.map((b, i) => b.key ?? i))
    const tL = new Set(tgt.labels.map((l, i) => l.key ?? i))
    const t0 = performance.now()
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = ease(k)
      const cur = {
        box: tgt.box.map((v, i) => from.box[i] + (v - from.box[i]) * e),
        blocks: [
          ...tgt.blocks.map((b, i) => {
            const p = prevB.get(b.key ?? i)
            if (!p) return { ...b, z: (b.z || 0) * e, h: (b.h ?? 1) * e, op: (b.op ?? 1) * e }
            const o = { ...b }
            for (const key of NUMK) {
              const a = p[key] ?? (key === 'op' ? 1 : 0), z = b[key] ?? (key === 'op' ? 1 : 0)
              o[key] = a + (z - a) * e
            }
            return o
          }),
          ...(k < 1 ? from.blocks.filter((b, i) => !tB.has(b.key ?? i)).map((p) => ({ ...p, z: (p.z || 0) * (1 - e), h: (p.h ?? 1) * (1 - e), op: (p.op ?? 1) * (1 - e) })) : []),
        ],
        labels: [
          ...tgt.labels.map((l, i) => {
            const p = prevL.get(l.key ?? i)
            if (!p) return { ...l, fo: e }
            const o = { ...l, fo: 1 }
            for (const key of ['x', 'y', 'z', 'dx', 'dy']) { const a = p[key] || 0, z = l[key] || 0; o[key] = a + (z - a) * e }
            return o
          }),
          ...(k < 1 ? from.labels.filter((l, i) => !tL.has(l.key ?? i)).map((p) => ({ ...p, fo: 1 - e })) : []),
        ],
      }
      live.current = cur
      setDisp(cur)
      if (k < 1) raf.current = requestAnimationFrame(step)
      else { live.current = tgt; setDisp(tgt) }
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [sig, tween, reduce, dur])

  const order = useMemo(() => [...disp.blocks].sort((p, q) => {
    if (!!p.wire !== !!q.wire) return p.wire ? 1 : -1
    const kp = p.x + p.y + (p.w + p.d) / 2, kq = q.x + q.y + (q.w + q.d) / 2
    return kp - kq || (p.z || 0) - (q.z || 0)
  }), [disp.blocks])
  const pad = 14, b = disp.box
  const v = [b[0] - pad, b[1] - pad, b[2] - b[0] + 2 * pad, b[3] - b[1] + 2 * pad].map((n) => n.toFixed(1)).join(' ')
  return (
    <svg viewBox={v} className={className} style={style} xmlns="http://www.w3.org/2000/svg" {...rest}>
      {order.map((blk, i) => <Prism key={blk.key ?? i} b={blk} u={u} />)}
      {disp.labels.map((l, i) => {
        const p = proj(l.x, l.y, l.z, u)
        return (
          <text key={l.key ?? i} x={p[0] + (l.dx || 0)} y={p[1] + (l.dy || 0)} textAnchor={l.anchor || 'start'} style={{ fill: l.fill || 'var(--soft)' }} fillOpacity={l.fo ?? 1}
            fontFamily="Geist Mono, monospace" fontSize={l.size || 11}>
            {l.t}
          </text>
        )
      })}
    </svg>
  )
}
