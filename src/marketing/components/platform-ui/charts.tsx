import { P } from './atoms'
import { seededRandom } from '../../lib/math-utils'

/* ============================================================================
   Deterministic SVG charts matching the platform's quant visuals.
   Seeded so every load and device renders the identical picture.
   ========================================================================== */

/** Daily cumulative equity — the step curve ending at +128.4R. */
export function EquitySteps({
  w = 300,
  h = 74,
  color = P.teal,
}: {
  w?: number
  h?: number
  color?: string
}) {
  const rand = seededRandom(507)
  const n = 90
  const vals: number[] = []
  let eq = 0
  for (let i = 0; i < n; i++) {
    eq += (rand() - 0.36) * 14
    eq = Math.max(-20, eq)
    vals.push(eq)
  }
  // Normalise so the endpoint is exactly the platform's +128.4R shape-wise.
  const max = Math.max(...vals, 1)
  const pts = vals.map((v, i) => {
    const x = (i / (n - 1)) * w
    const y = h - 6 - (v / max) * (h - 14)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const area = `0,${h} ${pts.join(' ')} ${w},${h}`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <polygon points={area} fill={color} opacity={0.09} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={1.6} />
    </svg>
  )
}

/** Monte Carlo — N simulation paths fanning into a probability cone. */
export function MonteCarloSvg({ w = 250, h = 110 }: { w?: number; h?: number }) {
  const rand = seededRandom(4545)
  const paths: { d: string; color: string; lead?: boolean }[] = []
  for (let p = 0; p < 14; p++) {
    const drift = 0.4 + (rand() - 0.4) * 0.9
    let v = 0
    const pts: string[] = []
    for (let i = 0; i <= 44; i++) {
      v += drift + (rand() - 0.5) * 3.2
      const x = (i / 44) * (w - 8) + 4
      const y = h - 12 - Math.max(-14, v) * ((h - 26) / 46)
      pts.push(`${x.toFixed(1)},${Math.min(h - 2, Math.max(2, y)).toFixed(1)}`)
    }
    paths.push({
      d: pts.join(' '),
      color: v > 0 ? P.teal : P.rose,
      lead: p === 7,
    })
  }
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <line x1={0} y1={h - 12} x2={w} y2={h - 12} stroke={P.line} strokeWidth={1} />
      {paths.map((p, i) => (
        <polyline
          key={i}
          points={p.d}
          fill="none"
          stroke={p.lead ? P.indigo : p.color}
          strokeWidth={p.lead ? 1.7 : 0.9}
          opacity={p.lead ? 1 : 0.4}
        />
      ))}
    </svg>
  )
}

/** Monthly box plot — IQR body, whisker, median tick. */
export function BoxPlotSvg({ w = 250, h = 96 }: { w?: number; h?: number }) {
  const rand = seededRandom(8081)
  const n = 9
  const bw = 12
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <line x1={0} y1={h / 2 + 8} x2={w} y2={h / 2 + 8} stroke={P.line} strokeWidth={1} />
      {Array.from({ length: n }, (_, i) => {
        const cx = ((i + 0.5) / n) * w
        const median = h / 2 + 8 - (rand() - 0.32) * 42
        const iqr = 9 + rand() * 17
        const whisk = iqr + 7 + rand() * 13
        const up = median < h / 2 + 8
        const color = up ? P.teal : P.rose
        return (
          <g key={i}>
            <line x1={cx} y1={median - whisk} x2={cx} y2={median + whisk} stroke={color} strokeWidth={1} opacity={0.45} />
            <rect x={cx - bw / 2} y={median - iqr / 2} width={bw} height={iqr} rx={2} fill={color} opacity={0.22} />
            <line x1={cx - bw / 2 - 1.5} y1={median} x2={cx + bw / 2 + 1.5} y2={median} stroke={color} strokeWidth={2} />
          </g>
        )
      })}
    </svg>
  )
}

/** Day × Hour performance heatmap. */
export function HeatmapSvg({ w = 250, h = 84 }: { w?: number; h?: number }) {
  const rand = seededRandom(1616)
  const cols = 24
  const rows = 7
  const cw = w / cols
  const ch = (h - 10) / rows
  const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  return (
    <svg width={w + 16} height={h} viewBox={`0 0 ${w + 16} ${h}`} style={{ display: 'block' }}>
      {days.map((d, r) => (
        <text
          key={d}
          x={0}
          y={r * ch + ch * 0.75}
          fontSize={5.5}
          fontFamily="'JetBrains Mono', monospace"
          fill={P.faint}
        >
          {d}
        </text>
      ))}
      {Array.from({ length: rows * cols }, (_, i) => {
        const r = Math.floor(i / cols)
        const c = i % cols
        const roll = rand()
        // Activity clusters at 15:00-20:00 like the real heatmap.
        const active = c >= 15 && c <= 20 && roll > 0.45
        const stray = roll > 0.965
        const val = active || stray ? rand() - 0.35 : 0
        const fill = val > 0.15 ? P.teal : val < -0.12 && val !== 0 ? P.rose : '#20242e'
        const op = val === 0 ? 1 : 0.25 + Math.min(0.75, Math.abs(val) * 1.6)
        return (
          <rect
            key={i}
            x={14 + c * cw}
            y={r * ch}
            width={cw - 1.4}
            height={ch - 1.4}
            rx={1.5}
            fill={fill}
            opacity={fill === '#20242e' ? 1 : op}
          />
        )
      })}
    </svg>
  )
}

/** Tilt-meter trace — the red behavioural intensity line. */
export function TiltSvg({ w = 210, h = 44 }: { w?: number; h?: number }) {
  const rand = seededRandom(55)
  const pts: string[] = []
  for (let i = 0; i <= 70; i++) {
    const x = (i / 70) * w
    const y = h - 6 - (0.25 + rand() * 0.62) * (h - 12)
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <line x1={0} y1={h * 0.42} x2={w} y2={h * 0.42} stroke={P.amber} strokeWidth={0.8} strokeDasharray="3 3" opacity={0.7} />
      <polyline points={pts.join(' ')} fill="none" stroke={P.rose} strokeWidth={1.1} opacity={0.85} />
    </svg>
  )
}
