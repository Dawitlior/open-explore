import { CTA, HoloGlow } from './ui/primitives'

/* ============================================================================
   TEASER — the product video, large and slightly tilted, on the LEFT; a short
   "taste of what's waiting" on the RIGHT. Muted autoplay loop; hover levels the
   tilt.
   ========================================================================== */

export function SectionTeaser() {
  return (
    <section id="demo" className="relative mx-auto w-full max-w-[1300px] px-6 py-28 md:px-10">
      <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.42fr_0.58fr]">
        {/* Video — left on desktop, tilted */}
        <div data-reveal className="relative order-2 lg:order-1" style={{ perspective: '1600px' }}>
          <HoloGlow className="!inset-[-6%]" opacity={0.36} blur={70} />
          <div className="relative overflow-hidden rounded-[22px] border border-line bg-surface p-2.5 elev-3 transition-transform duration-500 ease-out [transform:rotateY(7deg)_rotateX(3deg)] hover:[transform:rotateY(0deg)_rotateX(0deg)]">
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-teal/70" />
              </span>
              <span className="tnum ml-2 truncate rounded-md border border-line bg-canvas px-3 py-1 text-[11px] text-ink-faint">
                app.orcainvestment.com
              </span>
            </div>
            <div className="overflow-hidden rounded-xl bg-[#0f131b]">
              <video
                className="block w-full"
                src="/orcabrief.mp4"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
            </div>
          </div>
        </div>

        {/* Copy — right on desktop */}
        <div className="order-1 lg:order-2">
          <span
            data-reveal
            className="micro inline-flex items-center gap-2 rounded-full bg-indigo-soft px-3 py-1 text-indigo"
          >
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-indigo" />
            Sneak peek
          </span>
          <h2
            data-animate="title"
            className="mt-5 font-display text-[clamp(1.9rem,3.8vw,3rem)] leading-[1.08] font-bold text-ink"
          >
            A taste of what&apos;s <span className="text-indigo">waiting inside.</span>
          </h2>
          <p data-reveal className="mt-5 max-w-[420px] text-[16px] leading-[1.6] text-ink-mute">
            A 60-second tour inside the Orca platform — just enough to leave you wanting the rest.
          </p>
          <div data-reveal className="mt-8">
            <CTA href="/signup">Start free</CTA>
          </div>
        </div>
      </div>
    </section>
  )
}
