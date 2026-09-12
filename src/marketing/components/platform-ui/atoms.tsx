import type { ReactNode } from 'react'

/* ============================================================================
   Atoms for the platform-UI replicas rendered inside the 3D canvas.
   These mirror the live product: white cards, lavender sub-surfaces, mono
   uppercase micro-labels, tabular numerals, indigo/teal/rose data colours.
   Pure presentational HTML/CSS — no interactivity, no state.
   ========================================================================== */

export const P = {
  indigo: '#22d3ee',
  violet: '#a78bfa',
  teal: '#2dd4a7',
  rose: '#fb5b74',
  amber: '#f0b84a',
  ink: '#eef1f6',
  mute: '#949bab',
  faint: '#6b7280',
  lav: '#1b1e27',
  line: '#262b36',
} as const

export function PLabel({ children, color = P.faint }: { children: ReactNode; color?: string }) {
  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 8.5,
        fontWeight: 600,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color,
      }}
    >
      {children}
    </span>
  )
}

export function PValue({
  children,
  color = P.ink,
  size = 19,
}: {
  children: ReactNode
  color?: string
  size?: number
}) {
  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 700,
        fontSize: size,
        letterSpacing: '-0.02em',
        color,
        lineHeight: 1,
      }}
    >
      {children}
    </span>
  )
}

/** Stat tile — NET R / WIN RATE / R-EXPECTANCY / MAX DRAWDOWN. */
export function PStat({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub?: string
  color: string
}) {
  return (
    <div
      style={{
        background: '#1b1e27',
        border: `1px solid ${P.line}`,
        borderRadius: 10,
        padding: '9px 11px',
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        minWidth: 0,
      }}
    >
      <PLabel>{label}</PLabel>
      <PValue color={color}>{value}</PValue>
      {sub && <span style={{ fontSize: 8.5, color: P.faint, lineHeight: 1.2 }}>{sub}</span>}
    </div>
  )
}

/** LONG / SHORT direction pill. */
export function PDir({ dir }: { dir: 'LONG' | 'SHORT' }) {
  const long = dir === 'LONG'
  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: '0.08em',
        padding: '2px 7px',
        borderRadius: 99,
        color: long ? P.teal : P.rose,
        background: long ? 'rgba(45,212,167,0.16)' : 'rgba(251,91,116,0.16)',
      }}
    >
      {long ? '↑ LONG' : '↓ SHORT'}
    </span>
  )
}

/** WIN / LOSS result pill. */
export function PResult({ win }: { win: boolean }) {
  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: '0.1em',
        padding: '2px 7px',
        borderRadius: 6,
        color: win ? P.teal : P.rose,
        background: win ? 'rgba(45,212,167,0.16)' : 'rgba(251,91,116,0.16)',
      }}
    >
      {win ? 'WIN' : 'LOSS'}
    </span>
  )
}

/** The platform's signature score ring with a soft coloured glow. */
export function PRing({
  value,
  label,
  color,
  size = 64,
}: {
  value: number
  label: string
  color: string
  size?: number
}) {
  const stroke = 5.5
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const arc = c * 0.78
  const filled = arc * (value / 100)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg
          width={size}
          height={size}
          style={{ transform: 'rotate(130deg)', filter: `drop-shadow(0 0 6px ${color}66)` }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#262b36"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${c}`}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${c}`}
          />
        </svg>
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            fontSize: size * 0.28,
            color: P.ink,
          }}
        >
          {value}
        </span>
      </div>
      <PLabel>{label}</PLabel>
    </div>
  )
}

/** Consumption bar — DAILY 0% / WEEKLY 0% / MONTHLY 40% of limit. */
export function PBar({
  label,
  right,
  pct,
  color,
}: {
  label: string
  right: string
  pct: number
  color: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <PLabel color={P.mute}>{label}</PLabel>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            fontWeight: 600,
            color: P.ink,
          }}
        >
          {right}
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: '#262b36', overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.max(2, pct)}%`,
            height: '100%',
            borderRadius: 99,
            background: color,
          }}
        />
      </div>
      <span style={{ fontSize: 8, color: P.faint }}>{pct}% of limit consumed</span>
    </div>
  )
}

/** Panel header strip — window chrome + module name, like the platform's. */
export function PHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '9px 13px',
        borderBottom: `1px solid ${P.line}`,
        background: P.lav,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'flex', gap: 3.5 }}>
          {['#fb5b7455', '#f0b84a55', '#2dd4a755'].map((c) => (
            <span key={c} style={{ width: 6, height: 6, borderRadius: 99, background: c }} />
          ))}
        </span>
        <PLabel color={P.mute}>{title}</PLabel>
      </div>
      {right}
    </div>
  )
}
