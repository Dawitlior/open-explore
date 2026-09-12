import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/* ============================================================================
   FEATURE CAROUSEL — a 3D coverflow (TraderWaves-style). The centre slide sits
   flat and in focus; neighbours rotate away in perspective and fade. Circular,
   so both sides always show a neighbour. Arrows + dots + gentle autoplay.
   ========================================================================== */

type Slide = {
  img: string
  title: string
  desc: string
  fit: 'cover' | 'contain'
  pos: string
  scale: number
}

// Per-slide framing so each screenshot crops cleanly (tuned by hand):
const SLIDES: Slide[] = [
  { img: '/carousel/morning.png', title: 'Morning briefing', desc: 'Set your bias, plan and psychology before the session starts.', fit: 'cover', pos: 'center top', scale: 1 },
  { img: '/carousel/analytics.png', title: 'Advanced analytics', desc: 'Dashboards built around the setups you actually trade.', fit: 'cover', pos: 'center', scale: 1.08 },
  { img: '/carousel/insights.png', title: 'AI insights', desc: 'Multi-layer analysis that surfaces patterns you would never spot alone.', fit: 'contain', pos: 'center', scale: 1.08 },
  { img: '/carousel/economic.png', title: 'Economic calendar', desc: 'Every high-impact release before it moves your positions.', fit: 'cover', pos: 'center', scale: 1.18 },
  { img: '/carousel/calendar.png', title: 'P&L calendar', desc: "Every day's result at a glance — long vs short.", fit: 'cover', pos: 'center', scale: 1.05 },
]

const N = SLIDES.length

export function FeatureCarousel() {
  const [active, setActive] = useState(Math.floor(N / 2))
  const paused = useRef(false)

  const go = (dir: number) => setActive((a) => (a + dir + N) % N)

  // Gentle autoplay; pauses on hover / focus within.
  useEffect(() => {
    const id = setInterval(() => {
      if (!paused.current) setActive((a) => (a + 1) % N)
    }, 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className="relative mx-auto mt-14 max-w-[1100px]"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      {/* Stage */}
      <div className="relative h-[380px] [perspective:1800px] sm:h-[460px] lg:h-[560px]">
        {SLIDES.map((s, i) => {
          let offset = ((i - active + N) % N)
          if (offset > N / 2) offset -= N
          const abs = Math.abs(offset)
          const sign = Math.sign(offset)
          const x = sign * (abs === 1 ? 56 : abs === 2 ? 98 : 0)
          const ry = -sign * (abs === 1 ? 38 : abs === 2 ? 44 : 0)
          const scale = abs === 0 ? 1 : abs === 1 ? 0.82 : 0.66
          const opacity = abs === 0 ? 1 : abs === 1 ? 0.55 : 0.22
          const hidden = abs > 2
          const isCenter = abs === 0

          return (
            <div
              key={s.img}
              className="absolute top-0 left-1/2 w-[clamp(280px,58vw,600px)] transition-all duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                transform: `translateX(calc(-50% + ${x}%)) rotateY(${ry}deg) scale(${scale})`,
                opacity: hidden ? 0 : opacity,
                zIndex: 30 - abs * 10,
                pointerEvents: hidden ? 'none' : 'auto',
              }}
              aria-hidden={!isCenter}
            >
              <button
                onClick={() => !isCenter && setActive(i)}
                tabIndex={isCenter ? -1 : 0}
                className={`block w-full overflow-hidden rounded-2xl border border-line bg-surface text-left ${
                  isCenter ? 'elev-3 cursor-default' : 'elev-2 cursor-pointer'
                }`}
              >
                <div className="aspect-[16/10] overflow-hidden bg-surface">
                  <img
                    src={s.img}
                    alt={s.title}
                    className="h-full w-full"
                    style={{ objectFit: s.fit, objectPosition: s.pos, transform: `scale(${s.scale})` }}
                    draggable={false}
                  />
                </div>
                <div className="border-t border-line px-5 py-4">
                  <h4 className="font-display text-[16px] font-bold text-ink">{s.title}</h4>
                  <p className="mt-1 text-[13px] leading-snug text-ink-mute">{s.desc}</p>
                </div>
              </button>
            </div>
          )
        })}
      </div>

      {/* Arrows */}
      <button
        onClick={() => go(-1)}
        aria-label="Previous"
        className="absolute top-[38%] left-0 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-[0_6px_18px_-8px_rgba(17,19,24,0.35)] transition-all hover:-translate-y-0.5 hover:text-indigo sm:left-2"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={() => go(1)}
        aria-label="Next"
        className="absolute top-[38%] right-0 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-[0_6px_18px_-8px_rgba(17,19,24,0.35)] transition-all hover:-translate-y-0.5 hover:text-indigo sm:right-2"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Dots */}
      <div className="mt-8 flex items-center justify-center gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.img}
            onClick={() => setActive(i)}
            aria-label={`Go to ${s.title}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === active ? 'w-6 bg-indigo' : 'w-2 bg-line hover:bg-ink-faint'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
