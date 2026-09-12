import { P, PBar, PDir, PHeader, PLabel, PResult, PRing, PStat, PValue } from './atoms'
import { BoxPlotSvg, EquitySteps, HeatmapSvg, MonteCarloSvg, TiltSvg } from './charts'

/* ============================================================================
   High-fidelity replicas of the OrcaInvestment platform screens, composed for
   the 3D showcase. Figures shown are illustrative sample data (not a personal
   account): the January 2026 calendar, the SOL trade log, the risk command
   center, the psychology diagnosis.
   ========================================================================== */

const pad = { padding: 13 } as const
const row = { display: 'flex', alignItems: 'center' } as const

/* ── HERO · the dashboard, as a product shot ─────────────────────────── */

export function DashboardPanel() {
  return (
    <div className="ui-panel" style={{ width: 560 }}>
      <PHeader
        title="Dashboard · My Portfolio"
        right={<PLabel color={P.indigo}>Tier: Ultimate</PLabel>}
      />
      <div style={{ ...pad, display: 'flex', flexDirection: 'column', gap: 11, background: '#14171f' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <PStat label="Net R" value="+128.4R" color={P.teal} sub="Cumulative net profit" />
          <PStat label="Win rate" value="58%" color={P.ink} sub="Full history" />
          <PStat label="R-Expectancy" value="+0.956R" color={P.indigo} sub="Per trade, risk units" />
          <PStat label="Max drawdown" value="43.2%" color={P.amber} sub="Peak to trough" />
        </div>

        <div style={{ border: `1px solid ${P.line}`, borderRadius: 10, padding: '9px 11px' }}>
          <div style={{ ...row, justifyContent: 'space-between', marginBottom: 6 }}>
            <PLabel>Daily cumulative equity</PLabel>
            <PValue color={P.teal} size={12}>
              +128.4R
            </PValue>
          </div>
          <EquitySteps w={506} h={78} />
        </div>

        <div style={{ ...row, justifyContent: 'space-around', paddingTop: 2 }}>
          <PRing value={85} label="Orca score" color={P.indigo} />
          <PRing value={67} label="Regime fit" color={P.violet} />
          <PRing value={86} label="Risk consist." color={P.amber} />
          <PRing value={100} label="Discipline" color={P.teal} />
        </div>
      </div>
    </div>
  )
}

/* ── JOURNAL · the trade log ─────────────────────────────────────────── */

const TRADES = [
  { n: 512, date: 'Jul 20, 08:00 PM', dir: 'LONG' as const, entry: '77.03', exit: '77.41', r: '+0.35R', win: true },
  { n: 506, date: 'Jul 17, 07:57 PM', dir: 'LONG' as const, entry: '74.31', exit: '77.38', r: '+4.02R', win: true },
  { n: 505, date: 'Jul 17, 10:55 AM', dir: 'SHORT' as const, entry: '73.41', exit: '73.93', r: '-1.02R', win: false },
  { n: 504, date: 'Jul 16, 04:35 PM', dir: 'SHORT' as const, entry: '76.23', exit: '76.54', r: '-1.00R', win: false },
  { n: 502, date: 'Jul 10, 08:23 PM', dir: 'SHORT' as const, entry: '78.63', exit: '77.68', r: '+2.79R', win: true },
  { n: 497, date: 'Jun 19, 04:35 PM', dir: 'LONG' as const, entry: '68.74', exit: '73.73', r: '+16.63R', win: true },
]

export function TradeRows({ rows = TRADES.length }: { rows?: number }) {
  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '30px 1fr 62px 52px 52px 58px 44px',
          gap: 6,
          padding: '7px 13px',
          borderBottom: `1px solid ${P.line}`,
          background: P.lav,
        }}
      >
        {['#', 'Date', 'Dir', 'Entry', 'Exit', 'P&L', 'Result'].map((hd) => (
          <PLabel key={hd}>{hd}</PLabel>
        ))}
      </div>
      {TRADES.slice(0, rows).map((t, i) => (
        <div
          key={t.n}
          style={{
            display: 'grid',
            gridTemplateColumns: '30px 1fr 62px 52px 52px 58px 44px',
            gap: 6,
            alignItems: 'center',
            padding: '6.5px 13px',
            borderBottom: i < rows - 1 ? `1px solid ${P.line}` : 'none',
            fontSize: 9,
          }}
        >
          <span style={{ fontFamily: "'JetBrains Mono',monospace", color: P.faint }}>{t.n}</span>
          <span style={{ color: P.mute, fontSize: 8.5 }}>{t.date}</span>
          <PDir dir={t.dir} />
          <span className="tnum" style={{ color: P.ink }}>{t.entry}</span>
          <span className="tnum" style={{ color: P.ink }}>{t.exit}</span>
          <span
            className="tnum"
            style={{ fontWeight: 700, color: t.win ? P.teal : P.rose }}
          >
            {t.r}
          </span>
          <PResult win={t.win} />
        </div>
      ))}
    </div>
  )
}

export function TradeTablePanel() {
  return (
    <div className="ui-panel" style={{ width: 470 }}>
      <PHeader title="Trade Journal · full history" right={<PLabel color={P.teal}>● SOL · Bybit sync</PLabel>} />
      <TradeRows />
    </div>
  )
}

/* ── JOURNAL · January 2026 P&L calendar ─────────────────────────────── */

const CAL: Record<number, number> = {
  2: 11.0, 8: 2.0, 9: -1.0, 12: -1.0, 13: -1.0, 22: -1.0, 23: -1.0, 26: 3.0, 29: 22.9,
}

export function CalendarPanel() {
  const cells: (number | null)[] = [null, null, null, null, ...Array.from({ length: 31 }, (_, i) => i + 1)]
  return (
    <div className="ui-panel" style={{ width: 330 }}>
      <PHeader
        title="Calendar · January 2026"
        right={
          <span style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <PValue color={P.teal} size={11}>+33.9R</PValue>
            <PLabel>10 trades · 40%</PLabel>
          </span>
        }
      />
      <div style={{ padding: 11 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 5 }}>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <span key={d} style={{ textAlign: 'center', fontSize: 7, fontFamily: "'JetBrains Mono',monospace", color: P.faint }}>
              {d}
            </span>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((d, i) => {
            const v = d ? CAL[d] : undefined
            const bg = v === undefined ? (d ? '#171a22' : 'transparent') : v > 0 ? 'rgba(45,212,167,0.14)' : 'rgba(251,91,116,0.14)'
            const bc = v === undefined ? P.line : v > 0 ? 'rgba(45,212,167,0.35)' : 'rgba(251,91,116,0.35)'
            return (
              <div
                key={i}
                style={{
                  minHeight: 30,
                  borderRadius: 6,
                  border: d ? `1px solid ${bc}` : 'none',
                  background: bg,
                  padding: '2px 3px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                {d && <span style={{ fontSize: 6.5, color: P.faint, textAlign: 'right' }}>{d}</span>}
                {v !== undefined && (
                  <span
                    className="tnum"
                    style={{ fontSize: 7.5, fontWeight: 700, color: v > 0 ? P.teal : P.rose }}
                  >
                    {v > 0 ? '+' : ''}
                    {v.toFixed(1)}R
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── JOURNAL · module chips ──────────────────────────────────────────── */

export function ModulesChip() {
  const mods = [
    { icon: 'J', name: 'Trade Journal', sub: 'Sync on' },
    { icon: 'M', name: 'Morning & Evening', sub: 'Locked 07:12' },
    { icon: 'C', name: 'Calendar Hub', sub: '+33.9R Jan' },
  ]
  return (
    <div className="ui-chip" style={{ width: 240 }}>
      {mods.map((m, i) => (
        <div
          key={m.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '8px 12px',
            borderBottom: i < mods.length - 1 ? `1px solid ${P.line}` : 'none',
          }}
        >
          <span style={{ fontSize: 13 }}>{m.icon}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: P.ink }}>{m.name}</span>
            <span style={{ fontSize: 8, color: P.faint }}>{m.sub}</span>
          </div>
          <span
            className="live-dot"
            style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: 99, background: P.teal }}
          />
        </div>
      ))}
    </div>
  )
}

/* ── QUANT LAB · the analytics deck ──────────────────────────────────── */

export function QuantChartsPanel() {
  return (
    <div className="ui-panel" style={{ width: 560 }}>
      <PHeader title="Advanced Analytics Lab · unit: R-Multiple" right={<PLabel color={P.indigo}>UNIT R</PLabel>} />
      <div style={{ padding: 13, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
        {[
          { t: 'Monte Carlo · N=100', el: <MonteCarloSvg w={250} h={104} /> },
          { t: 'Monthly Box Plot', el: <BoxPlotSvg w={250} h={104} /> },
          { t: 'Performance Heatmap — Day × Hour', el: <HeatmapSvg w={234} h={86} /> },
          {
            t: 'Risk-Adjusted',
            el: (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, paddingTop: 4 }}>
                <PStat label="Sharpe" value="4.04" color={P.teal} />
                <PStat label="Sortino" value="14.22" color={P.teal} />
                <PStat label="Profit factor" value="2.31x" color={P.indigo} />
                <PStat label="Risk of ruin" value="0.0%" color={P.teal} />
              </div>
            ),
          },
        ].map((c) => (
          <div key={c.t} style={{ border: `1px solid ${P.line}`, borderRadius: 10, padding: '8px 10px' }}>
            <div style={{ marginBottom: 5 }}>
              <PLabel>{c.t}</PLabel>
            </div>
            {c.el}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SampleChip() {
  return (
    <div className="ui-chip" style={{ width: 232, padding: '10px 13px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <PLabel color={P.indigo}>Sample-size policy</PLabel>
        <span style={{ fontSize: 10, color: P.ink, fontWeight: 600, lineHeight: 1.35 }}>
          No verdict under 45 trades.
        </span>
        <span style={{ fontSize: 8.5, color: P.mute, lineHeight: 1.4 }}>
          Every stat here is computed on your full history — statistical noise never gets to call itself an edge.
        </span>
      </div>
    </div>
  )
}

/* ── RISK · command center ───────────────────────────────────────────── */

export function RiskPanel() {
  return (
    <div className="ui-panel" style={{ width: 430 }}>
      <PHeader
        title="Risk Command Center"
        right={
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <PValue color={P.amber} size={15}>51</PValue>
            <PLabel color={P.amber}>Moderate</PLabel>
          </span>
        }
      />
      <div style={{ padding: 13, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 11 }}>
          <PBar label="Daily" right="0.00R / -2R" pct={0} color={P.teal} />
          <PBar label="Weekly" right="0.00R / -5R" pct={0} color={P.teal} />
          <PBar label="Monthly" right="-4.05R / -10R" pct={40} color={P.amber} />
        </div>
        <div
          style={{
            border: `1px solid rgba(45,212,167,0.35)`,
            background: 'rgba(45,212,167,0.10)',
            borderRadius: 10,
            padding: '9px 11px',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
          }}
        >
          <span className="live-dot" style={{ width: 8, height: 8, borderRadius: 99, background: P.teal }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <PLabel color={P.teal}>Kill switch</PLabel>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: P.teal }}>CLEAR — trading allowed</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
            {['1h', '4h', '24h'].map((d) => (
              <span
                key={d}
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 8.5,
                  fontWeight: 600,
                  padding: '4px 9px',
                  borderRadius: 7,
                  border: `1px solid ${P.line}`,
                  background: '#14171f',
                  color: P.mute,
                }}
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function TiersChip() {
  const tiers = [
    { r: '-1R', s: 'Trade', c: P.teal },
    { r: '-2R', s: 'Daily', c: P.indigo },
    { r: '-5R', s: 'Weekly', c: P.amber },
    { r: '-10R', s: 'Monthly', c: P.rose },
  ]
  return (
    <div className="ui-chip" style={{ width: 250, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      {tiers.map((t, i) => (
        <div
          key={t.r}
          style={{
            padding: '9px 12px',
            borderRight: i % 2 === 0 ? `1px solid ${P.line}` : 'none',
            borderBottom: i < 2 ? `1px solid ${P.line}` : 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <PValue color={t.c} size={14}>{t.r}</PValue>
          <PLabel>{t.s}</PLabel>
        </div>
      ))}
    </div>
  )
}

/* ── TRADER MIND · behavioural mirror ────────────────────────────────── */

const MIRROR = [
  { said: 'I always respect my stop', actually: 'Moved it on 31% of losers' },
  { said: 'I trade the London open', actually: '68% of P&L lands in NY AM' },
  { said: 'I size consistently', actually: 'Risk doubles after a loss' },
]

export function MirrorFront() {
  return (
    <div className="ui-panel" style={{ width: 380 }}>
      <PHeader title="Psychology Diagnosis · full history" right={<PLabel color={P.violet}>Said</PLabel>} />
      <div style={{ padding: 13, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {MIRROR.map((m) => (
          <div
            key={m.said}
            style={{
              border: `1px solid ${P.line}`,
              background: P.lav,
              borderRadius: 9,
              padding: '8px 11px',
              fontSize: 10.5,
              color: P.ink,
              fontWeight: 500,
            }}
          >
            “{m.said}”
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 2 }}>
          <PLabel>Mental cap</PLabel>
          <PValue color={P.teal} size={14}>80</PValue>
          <PLabel>Current streak</PLabel>
          <PValue color={P.indigo} size={14}>2W</PValue>
        </div>
      </div>
    </div>
  )
}

export function MirrorBack() {
  return (
    <div className="ui-panel" style={{ width: 380 }}>
      <PHeader title="Behavioral cross-check" right={<PLabel color={P.rose}>Actually</PLabel>} />
      <div style={{ padding: 13, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {MIRROR.map((m) => (
          <div
            key={m.actually}
            style={{
              border: '1px solid rgba(251,91,116,0.3)',
              background: 'rgba(251,91,116,0.10)',
              borderRadius: 9,
              padding: '8px 11px',
              fontSize: 10.5,
              color: P.ink,
              fontWeight: 600,
            }}
          >
            {m.actually}
          </div>
        ))}
        <div style={{ border: `1px solid ${P.line}`, borderRadius: 9, padding: '7px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <PLabel>Tilt meter · intensity over time</PLabel>
            <PValue color={P.amber} size={11}>55 · MODERATE</PValue>
          </div>
          <TiltSvg w={330} h={40} />
        </div>
      </div>
    </div>
  )
}

/* ── EXPLODED STACK · the three product layers ───────────────────────── */

export function StackJournalLayer() {
  return (
    <div className="ui-panel" style={{ width: 490 }}>
      <PHeader title="Layer 01 — Automated Trade Journal" right={<PLabel color={P.teal}>● Live sync</PLabel>} />
      <TradeRows rows={4} />
    </div>
  )
}

export function StackReportsLayer() {
  return (
    <div className="ui-panel" style={{ width: 490 }}>
      <PHeader title="Layer 02 — Data-Driven Reports" right={<PLabel color={P.indigo}>full history</PLabel>} />
      <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 10 }}>
        <div style={{ border: `1px solid ${P.line}`, borderRadius: 9, padding: '7px 9px' }}>
          <PLabel>Monte Carlo · N=100</PLabel>
          <div style={{ marginTop: 4 }}>
            <MonteCarloSvg w={244} h={92} />
          </div>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          <PStat label="Net R" value="+128.4R" color={P.teal} />
          <PStat label="Expectancy" value="+0.956R" color={P.indigo} />
          <PStat label="Profit factor" value="2.31x" color={P.ink} />
        </div>
      </div>
    </div>
  )
}

export function StackMindLayer() {
  return (
    <div className="ui-panel" style={{ width: 490 }}>
      <PHeader title="Layer 03 — Trader Mind" right={<PLabel color={P.violet}>Behavioral engine</PLabel>} />
      <div style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <PRing value={100} label="Discipline" color={P.teal} size={58} />
          <PRing value={85} label="Orca" color={P.indigo} size={58} />
          <PRing value={100} label="Emotional" color={P.violet} size={58} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 9.5, color: P.mute, lineHeight: 1.45 }}>
            <span style={{ color: P.ink, fontWeight: 600 }}>Said · Actually.</span> The engine
            cross-checks what you believe against your real cadence, hesitations and trades.
          </div>
          <TiltSvg w={180} h={30} />
        </div>
      </div>
    </div>
  )
}
