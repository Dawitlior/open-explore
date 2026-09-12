import { Check, ArrowRight } from 'lucide-react'

/* ============================================================================
   NO CREDIT CARD — home section modeled 1:1 on the Appway "e-commerce" hero the
   founder referenced: text on the left, a violet curved blob on the right
   carrying an isometric credit-card illustration + floating tags. Message: you
   can get real value for free, no card required.
   ========================================================================== */

const V = '#7c3aed'

/* An isometric-style credit card, built with layered divs (chip, number, brand). */
function CreditCard() {
  return (
    <div className="relative" style={{ perspective: '1200px' }}>
      {/* faint card behind for depth */}
      <div
        aria-hidden
        className="absolute left-6 top-8 h-[210px] w-[335px] rounded-[20px] opacity-40 blur-[1px]"
        style={{ background: 'linear-gradient(135deg,#a78bfa,#7c3aed)', transform: 'rotate(-10deg)' }}
      />
      {/* main card */}
      <div
        className="relative h-[210px] w-[335px] overflow-hidden rounded-[20px] p-5 text-white shadow-[0_40px_70px_-24px_rgba(76,29,149,0.6)]"
        style={{ background: 'linear-gradient(135deg,#7c3aed 0%,#6d28d9 45%,#4c1d95 100%)', transform: 'rotate(-7deg)' }}
      >
        {/* sheen */}
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
        <div className="flex items-start justify-between">
          <span className="text-[12px] font-semibold tracking-[0.16em] text-white/70 uppercase">Orca · Free plan</span>
          {/* contactless glyph */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="text-white/70">
            <path d="M8 8a6 6 0 010 8M12 5a10 10 0 010 14M4 11a2.5 2.5 0 010 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        {/* chip */}
        <div className="mt-5 h-9 w-12 rounded-md" style={{ background: 'linear-gradient(135deg,#f6d68a,#c9a24a)' }} />
        {/* number */}
        <div className="mt-5 flex items-center gap-3 font-display text-[19px] tracking-[0.12em] text-white/90">
          <span>••••</span><span>••••</span><span>••••</span><span>0000</span>
        </div>
        {/* footer */}
        <div className="mt-4 flex items-end justify-between">
          <div>
            <div className="text-[9px] tracking-widest text-white/50 uppercase">No card required</div>
            <div className="text-[13px] font-semibold">Free forever tier</div>
          </div>
          {/* brand circles */}
          <div className="flex items-center">
            <span className="h-7 w-7 rounded-full bg-white/80" />
            <span className="-ml-3 h-7 w-7 rounded-full bg-white/40" />
          </div>
        </div>
      </div>

      {/* floating "$0.00 due" tag */}
      <div className="absolute -bottom-5 -left-6 flex items-center gap-2 rounded-2xl bg-surface px-4 py-2.5 elev-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e9f7ef] text-[#16a34a]"><Check className="h-4 w-4" strokeWidth={3} /></span>
        <span className="text-[13px] leading-tight"><b className="text-ink">$0.00</b> due today<br /><span className="text-ink-faint">no card on file</span></span>
      </div>
    </div>
  )
}

export function SectionNoCard() {
  return (
    <section className="relative mx-auto w-full max-w-[1240px] px-6 py-16 md:px-10 md:py-24">
      <div className="relative grid items-center gap-10 overflow-hidden rounded-[32px] border border-line bg-surface md:grid-cols-2">
        {/* copy */}
        <div className="px-8 py-12 md:px-12 md:py-16">
          <span className="text-[13px] font-bold tracking-[0.14em] uppercase" style={{ color: V }}>Start for free</span>
          <h2 data-animate="title" className="mt-4 font-display text-[clamp(1.9rem,3.8vw,3rem)] leading-[1.06] text-ink">
            <span className="font-normal">Give yourself the best chance — </span><span className="font-extrabold">no credit card required.</span>
          </h2>
          <p data-reveal className="mt-5 max-w-[440px] text-[15.5px] leading-[1.7] text-ink-mute">
            Real value, free from day one. Connect read-only, import any statement, and get your first
            insights — without ever entering a card. Upgrade only if and when Orca earns it.
          </p>
          <ul className="mt-6 flex flex-col gap-2.5">
            {['Free forever tier — no trial clock', 'No card, no commitment', 'Your data stays private'].map((t) => (
              <li key={t} className="flex items-center gap-2.5 text-[14.5px] text-ink">
                <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: V }}><Check className="h-3 w-3 text-white" strokeWidth={3} /></span>
                {t}
              </li>
            ))}
          </ul>
          <a href="/signup" className="group mt-8 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[14.5px] font-semibold text-white shadow-[0_14px_30px_-10px_rgba(124,58,237,0.6)] transition-transform hover:-translate-y-0.5" style={{ background: V }}>
            Start free
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.25} />
          </a>
        </div>

        {/* illustration on a violet blob */}
        <div className="relative min-h-[340px] overflow-hidden md:min-h-[440px]">
          <span aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(120% 120% at 80% 20%, #ede9fe 0%, #f3f0fe 45%, #ffffff 75%)' }} />
          {/* big curved blob */}
          <svg aria-hidden viewBox="0 0 600 500" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
            <path d="M600,0 L600,500 L120,500 C40,420 40,300 110,230 C190,150 150,40 280,20 C400,0 520,-20 600,0 Z" fill="#efeafe" />
            <path d="M600,40 L600,500 L200,500 C120,430 150,320 220,250 C300,170 260,90 380,70 C470,55 540,20 600,40 Z" fill="#ded2fb" />
          </svg>
          {/* floating shapes */}
          <span aria-hidden className="absolute right-[10%] top-[14%] h-3 w-3 rounded-full" style={{ background: V }} />
          <span aria-hidden className="absolute right-[22%] bottom-[16%] h-8 w-8 rounded-lg border-2 rotate-12" style={{ borderColor: '#c4b5fd' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <CreditCard />
          </div>
        </div>
      </div>
    </section>
  )
}
