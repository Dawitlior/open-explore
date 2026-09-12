import { CTA, Stars } from './ui/primitives'

/* ============================================================================
   HERO — the promise, on its own. Centered copy + two CTAs + a trust line.
   The product video and the trust/metrics live in their own sections below.
   ========================================================================== */

export function SectionHero() {
  return (
    <section id="hero" className="relative mx-auto w-full max-w-[1200px] px-5 pt-28 pb-16 md:px-10 md:pt-36 md:pb-20">
      <div className="mx-auto max-w-[760px] text-center">
        <div
          data-reveal
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] font-medium text-ink-2 elev-1"
        >
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-teal" />
          Free during launch — every feature unlocked
        </div>

        <h1
          data-animate="title"
          className="font-display text-[clamp(2rem,5.4vw,4.2rem)] leading-[1.05] font-bold text-ink md:leading-[1.03]"
        >
          You don&apos;t trade the way<br className="hidden sm:block" /> you{' '}
          <span className="text-indigo">think</span> you trade.
        </h1>

        <p data-reveal className="mx-auto mt-5 max-w-[560px] text-[16px] leading-[1.6] text-ink-mute md:mt-6 md:text-[17.5px]">
          Orca reads your real broker history and shows the gap between the story you tell yourself
          and what the data says — then hands you three fixes for tomorrow morning.
        </p>

        <div data-reveal className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:mt-9 sm:flex-row sm:flex-wrap sm:items-center">
          <CTA href="/signup" className="w-full justify-center sm:w-auto">Start free</CTA>
          <CTA href="#demo" variant="secondary" className="w-full justify-center sm:w-auto">
            <PlayGlyph /> See how it works
          </CTA>
        </div>

        <div data-reveal className="mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[13px] text-ink-faint">
          <Stars />
          <span className="font-semibold text-ink-2">Built from a trader, to a trader</span>
          <span aria-hidden="true">·</span>
          <span>No card required</span>
        </div>
      </div>
    </section>
  )
}

function PlayGlyph() {
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-soft">
      <svg width="8" height="9" viewBox="0 0 8 9" fill="#4f46e5" aria-hidden="true">
        <path d="M0 .9c0-.5.5-.8 1-.5l6 3.6c.4.3.4.9 0 1.1l-6 3.6c-.5.3-1 0-1-.5V.9z" />
      </svg>
    </span>
  )
}
