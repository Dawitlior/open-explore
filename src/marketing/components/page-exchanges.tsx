import { useMemo, useState } from 'react'
import { Cable, FileUp, Play, Search, Check, Clock } from 'lucide-react'
import { PageShell } from './page-shell'
import { CTA, HoloGlow, AssetImage } from './ui/primitives'

/* ============================================================================
   EXCHANGES PAGE (/exchanges)

   Best of the two references, re-ordered and re-styled:
   • from ref-1 (TradeZella): "does it support your broker?" framing + a
     searchable list where each broker carries its own market-type tags.
   • from ref-2 (TraderWaves): a card grid with logos + an "auto-sync" badge,
     clickable asset-class filter chips, a live "showing N" count, and a
     separate "coming soon" block.

   → one INTERACTIVE broker finder: type to search, tap a market to filter,
     the grid + count update live. Everything we don't (yet) connect to sits
     in Coming Soon.
   ========================================================================== */

type Market = 'Crypto' | 'Futures' | 'Stocks' | 'Options' | 'Forex'

type Broker = { name: string; logo?: string; markets: Market[]; soon?: boolean; upload?: boolean }

// One unified catalogue. The eight with a `logo` auto-sync today; every other
// broker/platform is listed too, tagged by market and marked `soon`.
//   soon + upload → import works today via file upload; API auto-sync is next.
//   soon (no upload) → not connectable yet.
// A search or filter (e.g. "Crypto") surfaces all of them together.
const BROKERS: Broker[] = [
  // ── Live (auto-syncing now) ────────────────────────────────────────────
  { name: 'Bybit', logo: '/logos/bybit.png', markets: ['Crypto', 'Futures'] },
  { name: 'Binance', logo: '/logos/binance.png', markets: ['Crypto', 'Futures'] },
  { name: 'Coinbase', logo: '/logos/coinbase.png', markets: ['Crypto'] },
  { name: 'Kraken', logo: '/logos/kraken.png', markets: ['Crypto', 'Futures'] },
  { name: 'MEXC', logo: '/logos/mexc.png', markets: ['Crypto', 'Futures'] },
  { name: 'Crypto.com', logo: '/logos/cryptocom.png', markets: ['Crypto'] },
  { name: 'Gate.io', logo: '/logos/gateio.png', markets: ['Crypto', 'Futures'] },
  { name: 'Interactive Brokers', logo: '/logos/ibkr.png', markets: ['Stocks', 'Options', 'Futures', 'Forex'] },

  // ── Crypto · file upload today, API auto-sync coming ───────────────────
  { name: 'OKX', markets: ['Crypto', 'Futures'], soon: true, upload: true },
  { name: 'Bitget', markets: ['Crypto', 'Futures'], soon: true, upload: true },
  { name: 'KuCoin', markets: ['Crypto', 'Futures'], soon: true, upload: true },
  { name: 'Deribit', markets: ['Crypto', 'Options', 'Futures'], soon: true, upload: true },
  { name: 'BingX', markets: ['Crypto', 'Futures'], soon: true, upload: true },
  { name: 'HTX', markets: ['Crypto', 'Futures'], soon: true, upload: true },
  { name: 'Bitfinex', markets: ['Crypto'], soon: true, upload: true },
  { name: 'Gemini', markets: ['Crypto'], soon: true, upload: true },
  { name: 'Bitstamp', markets: ['Crypto'], soon: true, upload: true },
  { name: 'Upbit', markets: ['Crypto'], soon: true, upload: true },
  { name: 'Phemex', markets: ['Crypto', 'Futures'], soon: true, upload: true },
  { name: 'WOO X', markets: ['Crypto', 'Futures'], soon: true, upload: true },

  // ── Coming soon · Stocks & Options ─────────────────────────────────────
  { name: 'Charles Schwab', markets: ['Stocks', 'Options'], soon: true },
  { name: 'thinkorswim', markets: ['Stocks', 'Options', 'Futures'], soon: true },
  { name: 'Robinhood', markets: ['Stocks', 'Options', 'Crypto'], soon: true },
  { name: 'Webull', markets: ['Stocks', 'Options'], soon: true },
  { name: 'E*TRADE', markets: ['Stocks', 'Options'], soon: true },
  { name: 'Fidelity', markets: ['Stocks', 'Options'], soon: true },
  { name: 'tastytrade', markets: ['Stocks', 'Options', 'Futures'], soon: true },
  { name: 'TradeStation', markets: ['Stocks', 'Options', 'Futures'], soon: true },
  { name: 'Questrade', markets: ['Stocks', 'Options'], soon: true },

  // ── Coming soon · Futures & Forex platforms ────────────────────────────
  { name: 'MetaTrader 4', markets: ['Forex', 'Futures'], soon: true },
  { name: 'MetaTrader 5', markets: ['Stocks', 'Forex', 'Futures'], soon: true },
  { name: 'cTrader', markets: ['Forex', 'Futures'], soon: true },
  { name: 'NinjaTrader', markets: ['Futures', 'Forex'], soon: true },
  { name: 'Tradovate', markets: ['Futures'], soon: true },
  { name: 'TradeLocker', markets: ['Forex', 'Futures'], soon: true },
  { name: 'DXtrade', markets: ['Forex', 'Futures'], soon: true },
  { name: 'MatchTrader', markets: ['Forex', 'Futures'], soon: true },
  { name: 'Oanda', markets: ['Forex'], soon: true },
  { name: 'Rithmic', markets: ['Futures'], soon: true },
]

const LIVE_COUNT = BROKERS.filter((b) => !b.soon).length

const FILTERS: ('All' | Market)[] = ['All', 'Crypto', 'Futures', 'Stocks', 'Options', 'Forex']

// Compact 2-letter monogram for brokers we don't have a logo for.
function monogram(name: string) {
  const words = name.replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase()
}

/**
 * The product demo, framed inside a tilted laptop. Falls back to a poster
 * with a play glyph if the video can't load.
 */
function LaptopVideo() {
  const [broken, setBroken] = useState(false)
  return (
    <div className="relative w-full [perspective:1800px]">
      <HoloGlow className="!inset-x-[-10%] !inset-y-[-8%]" opacity={0.4} blur={72} />
      <div className="relative transition-transform duration-500 ease-out [transform:rotateY(-11deg)_rotateX(6deg)_rotate(-1deg)] hover:[transform:rotateY(-4deg)_rotateX(2deg)]">
        {/* Screen */}
        <div className="relative rounded-[16px] border border-white/10 bg-[#0b0d12] p-[7px] shadow-[0_40px_80px_-24px_rgba(20,16,50,0.45)] ring-1 ring-black/5">
          <div className="relative overflow-hidden rounded-[10px] bg-[#0f131b]">
            {broken ? (
              <div className="relative flex aspect-[1280/832] w-full items-center justify-center">
                <AssetImage
                  src="/search.png"
                  alt="Connected exchanges inside Orca"
                  className="max-h-[80%] w-auto opacity-90"
                  fallback={<span className="text-[13px] text-white/50">Connected exchanges</span>}
                />
                <span className="absolute flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-[0_10px_40px_-8px_rgba(0,0,0,0.5)]">
                  <Play className="h-6 w-6 translate-x-0.5 text-char" fill="currentColor" />
                </span>
              </div>
            ) : (
              <video
                className="block aspect-[1280/832] w-full object-cover"
                src="/connectedexchanges.mp4"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                onError={() => setBroken(true)}
              />
            )}
          </div>
        </div>
        {/* Base / hinge */}
        <div className="relative mx-auto h-[14px] w-[103%] -translate-x-[1.5%] rounded-b-[14px] rounded-t-[3px] bg-gradient-to-b from-[#d7d9e2] to-[#a9adbd] shadow-[0_14px_24px_-12px_rgba(20,16,50,0.5)]">
          <div className="absolute top-0 left-1/2 h-[5px] w-[18%] -translate-x-1/2 rounded-b-[6px] bg-[#8b8fa0]" />
        </div>
      </div>
    </div>
  )
}

function BrokerFinder() {
  const [query, setQuery] = useState('')
  const [market, setMarket] = useState<'All' | Market>('All')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return BROKERS.filter((b) => {
      const matchesQuery = !q || b.name.toLowerCase().includes(q)
      const matchesMarket = market === 'All' || b.markets.includes(market)
      return matchesQuery && matchesMarket
    }).sort((a, b) => Number(!!a.soon) - Number(!!b.soon)) // live first
  }, [query, market])

  const liveShown = results.filter((b) => !b.soon).length

  return (
    <div>
      {/* Search */}
      <div data-reveal className="relative mx-auto max-w-[560px]">
        <Search className="pointer-events-none absolute top-1/2 left-4 h-4.5 w-4.5 -translate-y-1/2 text-ink-faint" strokeWidth={2} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your exchange (e.g. Bybit, Interactive Brokers…)"
          className="w-full rounded-full border border-line bg-surface py-3.5 pr-4 pl-11 text-[14.5px] text-ink shadow-sm outline-none transition-colors placeholder:text-ink-faint focus:border-indigo/50 focus:ring-4 focus:ring-indigo/10"
        />
      </div>

      {/* Market filter chips */}
      <div data-reveal className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {FILTERS.map((f) => {
          const active = market === f
          return (
            <button
              key={f}
              type="button"
              onClick={() => setMarket(f)}
              className={
                'rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all ' +
                (active
                  ? 'border-indigo bg-indigo text-white shadow-sm'
                  : 'border-line bg-surface text-ink-mute hover:border-indigo/30 hover:text-ink')
              }
            >
              {f === 'All' ? 'All markets' : f}
            </button>
          )
        })}
      </div>

      {/* Live count + legend */}
      <div data-reveal className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px]">
        <span className="text-ink-faint">
          Showing <span className="font-semibold text-ink">{results.length}</span> of {BROKERS.length}
          {market === 'All' && !query && <> · {LIVE_COUNT} auto-syncing today</>}
        </span>
        <span className="inline-flex items-center gap-1.5 text-ink-faint">
          <span className="h-2 w-2 rounded-full bg-teal" /> Auto-sync
          <span className="ml-3 h-2 w-2 rounded-full bg-violet" /> File upload
          <span className="ml-3 h-2 w-2 rounded-full border border-ink-faint/50" /> Coming soon
        </span>
      </div>

      {/* Grid */}
      {results.length > 0 ? (
        <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((b) => (
            <div
              key={b.name}
              data-reveal
              className={
                'group relative flex flex-col items-center gap-3 rounded-2xl border px-4 py-6 text-center transition-all duration-300 ' +
                (!b.soon
                  ? 'border-line bg-surface elev-1 hover:-translate-y-1 hover:border-indigo/25 hover:elev-3'
                  : b.upload
                    ? 'border-line bg-surface hover:-translate-y-1 hover:border-violet/30'
                    : 'border-dashed border-line bg-canvas hover:-translate-y-0.5 hover:border-indigo/25')
              }
            >
              {b.logo ? (
                <img src={b.logo} alt={b.name} className="h-12 w-12 rounded-xl object-contain" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-surface text-[15px] font-bold text-ink-mute">
                  {monogram(b.name)}
                </span>
              )}
              <span className={'text-[14px] leading-tight font-semibold ' + (b.soon && !b.upload ? 'text-ink-mute' : 'text-ink')}>
                {b.name}
              </span>
              <div className="flex flex-wrap justify-center gap-1">
                {b.markets.map((m) => (
                  <span key={m} className="rounded bg-canvas px-1.5 py-0.5 text-[10px] font-medium text-ink-mute">
                    {m}
                  </span>
                ))}
              </div>
              {!b.soon ? (
                <span className="mt-auto inline-flex items-center gap-1 rounded-full bg-teal-soft px-2.5 py-1 text-[10.5px] font-semibold text-teal">
                  <Check className="h-3 w-3" strokeWidth={3} />
                  Auto-sync
                </span>
              ) : b.upload ? (
                <span
                  className="mt-auto inline-flex items-center gap-1 rounded-full bg-violet-soft px-2.5 py-1 text-[10.5px] font-semibold text-violet"
                  title="Import via file upload today — API auto-sync coming soon"
                >
                  <FileUp className="h-3 w-3" strokeWidth={2.5} />
                  File upload
                </span>
              ) : (
                <span className="mt-auto inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-[10.5px] font-semibold text-ink-faint">
                  <Clock className="h-3 w-3" strokeWidth={2.5} />
                  Coming soon
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div data-reveal className="mx-auto mt-8 max-w-[440px] rounded-2xl border border-line bg-surface px-6 py-8 text-center">
          <p className="text-[14.5px] font-semibold text-ink">Not seeing your broker?</p>
          <p className="mx-auto mt-2 max-w-[320px] text-[13.5px] leading-relaxed text-ink-mute">
            You can still import any broker — just drop a statement and Universal Import reads it.
          </p>
          <div className="mt-4">
            <CTA href="/#engine" variant="secondary">See Universal Import</CTA>
          </div>
        </div>
      )}

      {/* When a filter hides every live option, nudge toward import */}
      {results.length > 0 && liveShown === 0 && (
        <p data-reveal className="mt-6 text-center text-[13px] text-ink-mute">
          None of these auto-sync yet — but you can{' '}
          <a href="/#engine" className="font-semibold text-indigo underline-offset-2 hover:underline">
            import any broker
          </a>{' '}
          today.
        </p>
      )}
    </div>
  )
}

export function ExchangesPage() {
  return (
    <PageShell>
      {/* Hero — copy beside the product demo in a tilted laptop */}
      <section className="mx-auto max-w-[1240px] px-6 pt-36 pb-10 md:px-10">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8">
          {/* Copy */}
          <div className="text-center lg:text-left">
            <span data-reveal className="micro inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-indigo">
              <Cable className="h-3.5 w-3.5" strokeWidth={2} />
              Exchanges
            </span>
            <h1 data-animate="title" className="mt-5 font-display text-[clamp(2.2rem,4.4vw,3.5rem)] leading-[1.05] font-bold text-ink">
              Connect your broker in <span className="text-indigo">60 seconds.</span>
            </h1>
            <p data-reveal className="mx-auto mt-5 max-w-[480px] text-[16.5px] leading-[1.6] text-ink-mute lg:mx-0">
              Link your exchange with a read-only key and your full history flows into Orca — tagged,
              scored and ready. No funds ever touched.
            </p>
            <div data-reveal className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-start [&>a]:w-full [&>a]:justify-center sm:[&>a]:w-auto">
              <CTA href="/signup">Start free</CTA>
              <CTA href="#finder" variant="secondary">Is my broker supported?</CTA>
            </div>
          </div>

          {/* Laptop demo */}
          <div data-reveal className="mx-auto w-full max-w-[620px] lg:max-w-none">
            <LaptopVideo />
          </div>
        </div>
      </section>

      {/* Broker finder (search + filter + grid + coming soon) */}
      <section id="finder" className="mx-auto max-w-[1000px] px-6 py-12 md:px-10">
        <div className="text-center">
          <span data-reveal className="micro text-ink-faint">Supported connections</span>
          <h2 data-animate="title" className="mt-3 font-display text-[clamp(1.7rem,3.2vw,2.5rem)] font-bold text-ink">
            Is your broker supported?
          </h2>
          <p data-reveal className="mx-auto mt-4 max-w-[520px] text-[15px] leading-relaxed text-ink-mute">
            Search it, or filter by what you trade. Every connection below auto-syncs your full
            history — no manual logging, ever.
          </p>
        </div>
        <div className="mt-10">
          <BrokerFinder />
        </div>
      </section>

      {/* No-API note */}
      <section className="mx-auto max-w-[900px] px-6 py-14 md:px-10">
        <div
          data-reveal
          className="flex flex-col items-center gap-4 rounded-[24px] border border-line px-6 py-10 text-center"
          style={{ background: 'radial-gradient(600px 300px at 80% 0%, rgba(124,58,237,0.10), transparent 60%), #f4effe' }}
        >
          <h2 className="font-display text-[clamp(1.5rem,2.6vw,2rem)] font-bold text-ink">
            Not on the list? You can still import.
          </h2>
          <p className="max-w-[520px] text-[15px] leading-relaxed text-ink-mute">
            Drop any broker statement — CSV, XLSX or PDF — and our Universal Import reads it all. No
            connection required.
          </p>
          <CTA href="/#engine" variant="secondary">See Universal Import</CTA>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-[900px] px-6 pt-6 pb-24 text-center md:px-10">
        <h2 data-animate="title" className="font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-bold text-ink">
          Connect once. Never log a trade by hand again.
        </h2>
        <div data-reveal className="mt-8">
          <CTA href="/signup">Start free</CTA>
        </div>
      </section>
    </PageShell>
  )
}
