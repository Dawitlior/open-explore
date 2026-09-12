import { FileSpreadsheet, Zap, Cable, Users } from 'lucide-react'
import { IconTile, type Accent } from './ui/primitives'

/* ============================================================================
   METRICS / TRUST BAR — sits right under the hero. Instead of invented numbers
   (X trades, Y users, fake Trustpilot), it states honest, pre-launch-true
   value props, then shows the exchanges Orca auto-syncs with. Own styling
   (icon cards + logo chips), not a copy of the reference bar.
   ========================================================================== */

const ITEMS: { Icon: typeof Zap; accent: Accent; label: string; sub: string }[] = [
  { Icon: FileSpreadsheet, accent: 'indigo', label: 'Zero Spreadsheets', sub: 'No manual logging, ever' },
  { Icon: Zap, accent: 'teal', label: '100% Automated', sub: 'Trades sync on their own' },
  { Icon: Cable, accent: 'indigo', label: 'Multi-Broker', sub: 'Connect every exchange' },
  { Icon: Users, accent: 'teal', label: 'Built by Traders', sub: 'By people who actually trade' },
]

const EXCHANGES = [
  { name: 'Bybit', logo: '/logos/bybit.png' },
  { name: 'Binance', logo: '/logos/binance.png' },
  { name: 'Coinbase', logo: '/logos/coinbase.png' },
  { name: 'Kraken', logo: '/logos/kraken.png' },
  { name: 'MEXC', logo: '/logos/mexc.png' },
  { name: 'Crypto.com', logo: '/logos/cryptocom.png' },
]

export function SectionMetrics() {
  return (
    <section id="trust" className="relative mx-auto w-full max-w-[1200px] px-6 py-10 md:px-10">
      {/* value props */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {ITEMS.map((it) => (
          <div
            key={it.label}
            data-reveal
            className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface px-5 py-4 elev-1"
          >
            <IconTile accent={it.accent}>
              <it.Icon className="h-5 w-5" strokeWidth={1.75} />
            </IconTile>
            <div className="flex flex-col">
              <span className="font-display text-[16px] font-bold text-ink">{it.label}</span>
              <span className="text-[12.5px] leading-snug text-ink-mute">{it.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* auto-syncs with */}
      <div data-reveal className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-3">
        <span className="micro text-ink-faint">Auto-syncs with</span>
        {EXCHANGES.map((e) => (
          <span
            key={e.name}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink-2"
          >
            <img src={e.logo} alt="" className="h-4 w-4 rounded-full object-contain" />
            {e.name}
          </span>
        ))}
        <span className="text-[13px] font-medium text-ink-faint">&amp; more</span>
      </div>
    </section>
  )
}
