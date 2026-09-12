import { Check } from 'lucide-react'

/* ============================================================================
   GET THE APP — home section in the "AI Insights" style: a dark navy band with
   violet accents and line-art, a clean phone mockup (built in-code) and App
   Store / Google Play badges. Redesigned for a more premium, less busy look.
   ========================================================================== */

const NAVY = '#14123a'
const V = '#7c3aed'

function AppleBadge() {
  return (
    <a href="/signup" className="inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white px-5 py-3 text-black transition-transform hover:-translate-y-0.5">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M16.4 12.9c0-2 1.6-2.9 1.7-3-.9-1.4-2.4-1.5-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.3 2-1.4 2.4-.4 6 1 8 .7 1 1.4 2 2.4 2 .9 0 1.3-.6 2.4-.6s1.4.6 2.4.6 1.6-.9 2.3-1.9c.7-1.1 1-2.1 1-2.2-.1 0-2-.8-2-3zM14.7 6.9c.5-.6.9-1.5.8-2.4-.8 0-1.7.5-2.2 1.2-.5.5-.9 1.4-.8 2.3.9 0 1.8-.5 2.2-1.1z" />
      </svg>
      <span className="text-left leading-tight">
        <span className="block text-[10px] text-black/60">Download on the</span>
        <span className="block text-[15px] font-semibold">App Store</span>
      </span>
    </a>
  )
}
function PlayBadge() {
  return (
    <a href="/signup" className="inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white px-5 py-3 text-black transition-transform hover:-translate-y-0.5">
      <svg width="20" height="22" viewBox="0 0 512 512" aria-hidden>
        <path d="M64 48c-6 3-10 10-10 20v376c0 10 4 17 10 20l210-208z" fill="#34a853" />
        <path d="M64 48l210 208 62-62L110 40c-18-10-34-6-46 8z" fill="#4285f4" />
        <path d="M64 464l210-208 62 62-226 130c-18 10-34 6-46-8z" fill="#ea4335" />
        <path d="M336 194l72 42c22 13 22 33 0 46l-72 42-62-62z" fill="#fbbc04" />
      </svg>
      <span className="text-left leading-tight">
        <span className="block text-[10px] text-black/60">Get it on</span>
        <span className="block text-[15px] font-semibold">Google Play</span>
      </span>
    </a>
  )
}

/* A clean phone mockup with an in-code Orca screen (no image asset). */
function PhoneMock() {
  return (
    <div className="relative">
      {/* glow */}
      <span aria-hidden className="absolute -inset-10 -z-10 rounded-full opacity-60 blur-3xl" style={{ background: 'radial-gradient(50% 50% at 50% 40%, rgba(124,58,237,0.6), transparent 70%)' }} />
      <div className="w-[248px] rounded-[44px] border-[11px] border-[#26234d] bg-[#0f0d29] shadow-[0_50px_90px_-30px_rgba(0,0,0,0.7)] [transform:rotate(-4deg)]">
        <div className="relative overflow-hidden rounded-[33px]" style={{ background: 'linear-gradient(180deg,#1c1948,#141234)' }}>
          {/* notch */}
          <span className="absolute left-1/2 top-2.5 h-1.5 w-20 -translate-x-1/2 rounded-full bg-black/50" />
          <div className="px-5 pt-9 pb-5 text-white">
            <div className="flex items-center justify-between text-[10px] text-white/40">
              <span>9:41</span>
              <span className="flex gap-1"><span className="h-1.5 w-1.5 rounded-full bg-white/40" /><span className="h-1.5 w-1.5 rounded-full bg-white/40" /><span className="h-1.5 w-1.5 rounded-full bg-white/40" /></span>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-display text-[16px] font-bold">Orca</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: V }}><span className="h-2.5 w-2.5 rounded-full bg-white/90" /></span>
            </div>

            {/* trader DNA hero card */}
            <div className="mt-4 flex items-center gap-4 rounded-2xl bg-white/5 p-4">
              <div className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(${V} 0 82%, rgba(255,255,255,0.1) 82% 100%)` }}>
                <span className="flex h-[56px] w-[56px] flex-col items-center justify-center rounded-full" style={{ background: '#141234' }}>
                  <span className="font-display text-[18px] font-bold leading-none">82</span>
                </span>
              </div>
              <div>
                <div className="text-[11px] text-white/50">Trader DNA</div>
                <div className="text-[14px] font-semibold">Strong &amp; steady</div>
                <div className="mt-1 text-[11px] font-semibold" style={{ color: '#4ade80' }}>▲ +4 this week</div>
              </div>
            </div>

            {/* equity line */}
            <div className="mt-3 rounded-2xl bg-white/5 p-4">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/50">Equity</span>
                <span className="font-semibold" style={{ color: '#4ade80' }}>+1.8R today</span>
              </div>
              <svg viewBox="0 0 200 56" className="mt-2 w-full" fill="none" aria-hidden>
                <path d="M2 46 C 30 40, 44 30, 66 32 S 104 18, 128 20 S 168 6, 198 8" stroke={V} strokeWidth="2.5" strokeLinecap="round" />
                <path d="M2 46 C 30 40, 44 30, 66 32 S 104 18, 128 20 S 168 6, 198 8 L198 56 L2 56 Z" fill="url(#g)" opacity="0.25" />
                <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={V} /><stop offset="1" stopColor={V} stopOpacity="0" /></linearGradient></defs>
              </svg>
            </div>

            {/* bottom nav */}
            <div className="mt-4 flex items-center justify-around border-t border-white/10 pt-3">
              {[true, false, false, false].map((on, i) => (
                <span key={i} className="h-2 w-2 rounded-full" style={{ background: on ? V : 'rgba(255,255,255,0.25)' }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SectionApps() {
  return (
    <section className="mx-auto w-full max-w-[1240px] px-6 py-16 md:px-10 md:py-24">
      <div className="relative overflow-hidden rounded-[32px] px-8 py-14 md:px-16 md:py-20" style={{ background: NAVY }}>
        {/* line-art + glow accents */}
        <svg aria-hidden className="pointer-events-none absolute left-12 top-10" width="48" height="14" viewBox="0 0 48 14" fill="none"><path d="M2 8C6 2 10 2 14 8s8 6 12 0 8-6 12 0 6 4 8 2" stroke="rgba(255,255,255,0.22)" strokeWidth="2.4" strokeLinecap="round" /></svg>
        <span aria-hidden className="pointer-events-none absolute right-16 top-12 text-3xl font-light text-white/15">+</span>
        <span aria-hidden className="pointer-events-none absolute left-1/2 bottom-8 h-9 w-9 rounded-lg border-2 rotate-12" style={{ borderColor: 'rgba(255,255,255,0.12)' }} />

        <div className="relative grid items-center gap-12 md:grid-cols-[0.85fr_1.15fr]">
          {/* phone */}
          <div className="order-2 flex justify-center md:order-1 md:justify-start">
            <PhoneMock />
          </div>
          {/* copy */}
          <div className="order-1 md:order-2">
            <span className="text-[13px] font-bold tracking-[0.14em] uppercase" style={{ color: '#c4b5fd' }}>Orca on mobile</span>
            <h2 data-animate="title" className="mt-4 font-display text-[clamp(2rem,4vw,3.2rem)] leading-[1.04] text-white">
              <span className="font-normal">Your edge, </span><span className="font-extrabold">in your pocket</span>
            </h2>
            <p data-reveal className="mt-5 max-w-[480px] text-[15.5px] leading-[1.7] text-white/70">
              The full journal, your Trader DNA and every risk alert — wherever you are. Free to download,
              and it picks up exactly where your desktop left off.
            </p>
            <div className="mt-7 grid max-w-[440px] gap-2.5 sm:grid-cols-2">
              {['Free to download', 'Real-time breach alerts', 'Synced across devices', 'iOS 15+ · Android 8+'].map((t) => (
                <span key={t} className="flex items-center gap-2 text-[14px] text-white/85"><Check className="h-4 w-4 shrink-0" style={{ color: '#4ade80' }} strokeWidth={2.5} /> {t}</span>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <AppleBadge />
              <PlayBadge />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
