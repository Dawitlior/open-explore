import { CTA, Section } from './ui/primitives'

/* ============================================================================
   TRADER MIND — the flagship behavioural section.

   Palette is deliberately restrained to three roles, nothing else:
     · ink / slate  → neutral structure and "Said" (what you believe)
     · emerald      → measured truth / discipline
     · rose         → the gap, the risk, the tell
   No indigo, violet, amber. No floating badge soup. Every data point sits in a
   bordered, evenly-padded container with a clear type hierarchy — institutional,
   not decorative.
   ========================================================================== */

/** The three measured gaps between belief and behaviour. */
const MIRROR = [
  { said: 'I always respect my stop', actually: 'Stop moved on 31% of losers', delta: '+31%', high: true },
  { said: 'I trade the London open', actually: '68% of P&L lands in NY AM', delta: '68%', high: false },
  { said: 'I size consistently', actually: 'Risk doubles after a loss', delta: '2.0×', high: true },
]

const PROCESS = [
  { n: '01', title: 'Answer', body: '12 behavioural questions. Three minutes, no wrong answers.' },
  { n: '02', title: 'Cross-check', body: 'The engine measures what you said against your real cadence, hesitations and fills.' },
  { n: '03', title: 'Act', body: 'A personal profile and three concrete actions for tomorrow morning.' },
]

export function SectionMainframe() {
  return (
    <Section id="mainframe" minH="min-h-[190vh]">
      {/* ── Behavioural mirror ─────────────────────────────────────────── */}
      <div className="py-16">
        {/* Header constrained to a left column so the 3D layer behind it never
            competes with the copy. */}
        <div className="max-w-[640px]">
          <div data-reveal className="flex items-center gap-3">
            <span className="h-px w-7 bg-ink/20" />
            <span className="micro text-ink-faint">Orca · Mainframe</span>
          </div>
          <h2
            data-animate="title"
            className="font-display mt-6 text-[clamp(2rem,4.4vw,3.4rem)] leading-[1.04] font-bold text-ink"
          >
            The engine that knows how you <span className="text-teal">actually</span> trade.
          </h2>
          <p data-reveal className="mt-5 text-[16.5px] leading-relaxed text-ink-mute">
            Trader Mind surfaces the gap between how you think you trade and how you actually do —
            then hands you three things to fix tomorrow.
          </p>
        </div>

        {/* The mirror: one institutional card, three rows, a hard column rule
            down the middle. Said (muted) vs Actually (ink), severity dot as the
            only colour. This is the centrepiece. */}
        <div
          data-reveal
          className="mt-14 overflow-hidden rounded-2xl border border-line bg-surface elev-3"
        >
          <div className="grid grid-cols-[1fr_auto_1.1fr] items-stretch">
            <div className="border-b border-line bg-canvas px-7 py-4">
              <span className="micro text-ink-faint">What you said</span>
            </div>
            <div className="border-b border-line bg-canvas px-4 py-4 text-center">
              <span className="micro text-ink-faint">Gap</span>
            </div>
            <div className="border-b border-line bg-indigo-soft px-7 py-4">
              <span className="micro text-indigo">What the data shows</span>
            </div>

            {MIRROR.map((m, i) => {
              const last = i === MIRROR.length - 1
              const bd = last ? '' : 'border-b border-line'
              return (
                <div key={m.said} className="contents">
                  <div className={`flex items-center px-7 py-6 text-[15px] leading-snug text-ink-mute ${bd}`}>
                    <span className="text-ink-faint">“</span>
                    {m.said}
                    <span className="text-ink-faint">”</span>
                  </div>

                  <div className={`flex flex-col items-center justify-center gap-1.5 px-4 py-6 ${bd}`}>
                    <span className={`h-2 w-2 rounded-full ${m.high ? 'bg-rose' : 'bg-teal'}`} />
                    <span className={`tnum text-[13px] font-bold ${m.high ? 'text-rose' : 'text-teal'}`}>
                      {m.delta}
                    </span>
                  </div>

                  <div className={`flex items-center bg-ink/[0.015] px-7 py-6 text-[15px] leading-snug font-semibold text-ink ${bd}`}>
                    {m.actually}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer — one summary readout, institutional */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line bg-canvas px-7 py-4">
            <span className="micro text-ink-faint">Behavioral health index · full history</span>
            <div className="flex items-center gap-6">
              <span className="flex items-baseline gap-2">
                <span className="tnum text-[18px] font-bold text-ink">80</span>
                <span className="micro text-ink-faint">Mental cap</span>
              </span>
              <span className="flex items-baseline gap-2">
                <span className="tnum text-[18px] font-bold text-teal">2W</span>
                <span className="micro text-ink-faint">Streak</span>
              </span>
              <span className="flex items-baseline gap-2">
                <span className="tnum text-[18px] font-bold text-rose">55</span>
                <span className="micro text-ink-faint">Tilt</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Process — a clean numbered rail, uniform styling ────────────── */}
      <div className="py-14">
        <div data-reveal className="max-w-[560px]">
          <span className="micro text-ink-faint">How it works</span>
          <h3 className="font-display mt-4 text-[clamp(1.6rem,3vw,2.3rem)] leading-tight font-bold text-ink">
            Three minutes in. Three moves out.
          </h3>
        </div>

        <div className="mt-12 grid grid-cols-1 overflow-hidden rounded-2xl border border-line bg-surface elev-2 md:grid-cols-3">
          {PROCESS.map((s, i) => (
            <div
              data-reveal
              key={s.n}
              className={`relative p-8 ${
                i < PROCESS.length - 1 ? 'border-b border-line md:border-r md:border-b-0' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="tnum flex h-8 w-8 items-center justify-center rounded-full bg-indigo text-[13px] font-bold text-[#06171b]">
                  {s.n}
                </span>
                {i < PROCESS.length - 1 && <span className="hidden h-px flex-1 bg-line md:block" />}
              </div>
              <h4 className="font-display mt-5 text-[19px] font-semibold text-ink">{s.title}</h4>
              <p className="mt-2.5 text-[14px] leading-relaxed text-ink-mute">{s.body}</p>
            </div>
          ))}
        </div>

        <div data-reveal className="mt-9">
          <CTA href="#cta">Discover your trader profile</CTA>
        </div>
      </div>

      {/* ── Community + final CTA — the reference's dark closing band ───── */}
      <div id="cta" className="py-16">
        <div
          data-reveal
          className="relative overflow-hidden rounded-[28px] border border-line bg-canvas-deep px-8 py-16 text-center elev-3 md:px-16 md:py-20"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(620px 320px at 80% 120%, rgba(34,211,238,0.22), transparent 70%),' +
                'radial-gradient(520px 280px at 12% -10%, rgba(240,184,74,0.14), transparent 70%)',
            }}
          />
          <div className="relative">
            <span className="micro text-white/50">Community · built by an active trader</span>
            <h3 className="font-display mx-auto mt-5 max-w-[720px] text-[clamp(1.9rem,4vw,3.1rem)] leading-[1.05] font-bold text-white">
              Take full control of your
              <br />
              trading — starting today.
            </h3>
            <p className="mx-auto mt-5 max-w-[500px] text-[15px] leading-relaxed text-white/60">
              A smart, automated trading journal. Every trade, every stat, one better decision.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#cta"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[14.5px] font-semibold text-ink transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-12px_rgba(255,255,255,0.3)]"
              >
                Enter app
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </a>
              <a
                href="#cta"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-7 py-3.5 text-[14.5px] font-medium text-white/80 transition-colors duration-300 hover:border-white/40 hover:text-white"
              >
                Join the community
              </a>
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}
