import { AssetImage, CTA } from './ui/primitives'

/* ============================================================================
   INTEGRATIONS — constellation on the LEFT, copy on the RIGHT. Each badge is a
   real exchange logo in a round chip.

   Two kinds of logo:
   • bleed  — the logo is already a full circular badge (Bybit, Binance,
     Crypto.com): it fills the whole chip edge-to-edge.
   • fit    — a transparent icon/wordmark on a white chip; `fit` is the fraction
     of the chip it occupies (tuned per logo so each reads at a similar weight).
   ========================================================================== */

type Brand = {
  name: string
  logo: string
  top: string
  left: string
  size: number
  bleed?: boolean
  fit?: number
}

const BRANDS: Brand[] = [
  { name: 'Bybit', logo: '/logos/bybit.png', top: '30%', left: '34%', size: 76, bleed: true },
  { name: 'Binance', logo: '/logos/binance.png', top: '48%', left: '62%', size: 66, bleed: true },
  { name: 'Interactive Brokers', logo: '/logos/ibkr.png', top: '8%', left: '58%', size: 60, fit: 0.66 },
  { name: 'MEXC', logo: '/logos/mexc.png', top: '14%', left: '18%', size: 58, fit: 0.84 },
  { name: 'Coinbase', logo: '/logos/coinbase.png', top: '60%', left: '20%', size: 64, fit: 0.66 },
  { name: 'Crypto.com', logo: '/logos/cryptocom.png', top: '66%', left: '48%', size: 58, bleed: true },
  { name: 'Kraken', logo: '/logos/kraken.png', top: '38%', left: '86%', size: 60, fit: 0.68 },
  { name: 'Gate.io', logo: '/logos/gateio.png', top: '80%', left: '72%', size: 56, fit: 0.72 },
]

function BrandBadge({ brand, size }: { brand: Brand; size: number }) {
  if (brand.bleed) {
    return (
      <span
        title={brand.name}
        className="block overflow-hidden rounded-full border border-line elev-2"
        style={{ width: size, height: size }}
      >
        <img src={brand.logo} alt={brand.name} className="h-full w-full object-cover" />
      </span>
    )
  }
  const inner = size * (brand.fit ?? 0.68)
  return (
    <span
      title={brand.name}
      className="flex items-center justify-center overflow-hidden rounded-full border border-line bg-surface elev-2"
      style={{ width: size, height: size }}
    >
      <span className="flex items-center justify-center" style={{ width: inner, height: inner }}>
        <AssetImage
          src={brand.logo}
          alt={brand.name}
          className="max-h-full max-w-full object-contain"
          fallback={<span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-line" />}
        />
      </span>
    </span>
  )
}

export function SectionIntegrations() {
  return (
    <section id="integrations" className="relative mx-auto w-full max-w-[1200px] px-6 py-36 md:px-10">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Constellation — desktop (left) */}
        <div data-side="left" className="relative order-2 hidden min-h-[480px] lg:order-1 lg:block">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-[8%] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.10), transparent 68%)' }}
          />
          {BRANDS.map((b, i) => (
            <span
              key={b.name}
              className="float-slow absolute -translate-x-1/2 -translate-y-1/2"
              style={{ top: b.top, left: b.left, animationDelay: `${(i % 5) * 0.6}s` }}
            >
              <BrandBadge brand={b} size={b.size} />
            </span>
          ))}
        </div>

        {/* Constellation — mobile reflow */}
        <div data-side="left" className="order-2 flex flex-wrap justify-center gap-4 lg:hidden">
          {BRANDS.map((b) => (
            <BrandBadge key={b.name} brand={b} size={60} />
          ))}
        </div>

        {/* Copy (right) */}
        <div data-side="right" className="order-1 lg:order-2">
          <span className="micro inline-flex rounded-full bg-indigo-soft px-3 py-1 text-indigo">
            Integrations
          </span>
          <h2 className="mt-5 font-display text-[clamp(1.9rem,3.6vw,2.9rem)] leading-[1.08] font-bold text-ink">
            Connect <span className="text-indigo">any exchange</span> and follow every trade with ease.
          </h2>
          <p className="mt-5 max-w-[460px] text-[16px] leading-[1.6] text-ink-mute">
            Link every exchange in a couple of clicks and track them all in one clean, professional
            view — no spreadsheets, no manual logging.
          </p>
          <div className="mt-8">
            <CTA href="/exchanges">
              Learn more
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </CTA>
          </div>
        </div>
      </div>
    </section>
  )
}
