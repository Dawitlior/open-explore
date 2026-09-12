import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { CTA, HoloGlow, AssetImage, type Accent } from '../ui/primitives'
import { HeroScene, HeroWave } from './hero-shapes'

export type HeroBackdrop = 'blob' | 'scene' | 'wave' | 'none' | 'trader'

/* ============================================================================
   Reusable feature-page vocabulary — an alternating two-column rhythm with
   scroll-reveal, in the site's cool-light / violet system. Modeled on the
   editorial "eyebrow → headline → divider → copy → visual" flow.
   ========================================================================== */

const ACCENT_TEXT: Record<Accent, string> = {
  indigo: 'text-indigo',
  teal: 'text-teal',
  rose: 'text-rose',
  amber: 'text-amber',
  violet: 'text-violet',
}
const ACCENT_RULE: Record<Accent, string> = {
  indigo: 'bg-indigo',
  teal: 'bg-teal',
  rose: 'bg-rose',
  amber: 'bg-amber',
  violet: 'bg-violet',
}

/* ── Decorative Haikei shapes (blobs + sparkles) ─────────────────────────── */

const BLOBS = {
  // herodash.svg — the big hero blob
  hero: {
    d: 'M341.4 -316.6C428.6 -162.8 476.1 -21.7 449.3 105.3C422.5 232.2 321.5 345 197.2 401.8C73 458.6 -74.3 459.5 -227.3 409.7C-380.2 360 -538.6 259.5 -628.7 81.5C-718.8 -96.6 -740.5 -352.2 -624.4 -512.6C-508.2 -672.9 -254.1 -738 -63.5 -687.3C127.1 -636.7 254.1 -470.3 341.4 -316.6',
    vb: '-780 -730 1320 1240',
  },
  // blob-haikei-side.svg — smaller accent blob for the empty gaps
  side: {
    d: 'M103 -111.9C135.4 -70.7 164.7 -35.4 174.2 9.5C183.8 54.4 173.6 108.9 141.2 156.1C108.9 203.2 54.4 243.1 -8.1 251.2C-70.7 259.4 -141.4 235.8 -174.3 188.6C-207.1 141.4 -202 70.7 -186.6 15.4C-171.2 -39.8 -145.3 -79.7 -112.5 -120.8C-79.7 -162 -39.8 -204.5 -2.2 -202.3C35.4 -200 70.7 -153 103 -111.9',
    vb: '-230 -230 440 500',
  },
}

let blobSeq = 0

export function Blob({
  variant = 'side',
  className = '',
  from = '#8b5cf6',
  to = '#6d28d9',
  morph = false,
}: {
  variant?: keyof typeof BLOBS
  className?: string
  from?: string
  to?: string
  morph?: boolean
}) {
  const b = BLOBS[variant]
  const id = `blob-grad-${blobSeq++}`
  return (
    <svg viewBox={b.vb} aria-hidden className={className} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <path className={morph ? 'blob-morph' : undefined} d={b.d} fill={`url(#${id})`} />
    </svg>
  )
}

type Spark = { top: string; left: string; size: number; delay: string }

/** Scattered twinkling 4-point sparkles — fills empty space with life. */
export function Sparkles({
  points,
  color = '#ffffff',
  className = '',
}: {
  points: Spark[]
  color?: string
  className?: string
}) {
  return (
    <div aria-hidden className={'pointer-events-none absolute inset-0 overflow-hidden ' + className}>
      {points.map((p, i) => (
        <svg
          key={i}
          width={p.size}
          height={p.size}
          viewBox="0 0 24 24"
          className="twinkle absolute"
          style={{ top: p.top, left: p.left, color, animationDelay: p.delay }}
        >
          <path
            d="M12 0C12 6.6 6.6 12 0 12C6.6 12 12 17.4 12 24C12 17.4 17.4 12 24 12C17.4 12 12 6.6 12 0Z"
            fill="currentColor"
          />
        </svg>
      ))}
    </div>
  )
}

// A gentle sparkle scatter for the empty margins around a light section.
const GAP_SPARKS: Spark[] = [
  { top: '10%', left: '6%', size: 13, delay: '0s' },
  { top: '18%', left: '92%', size: 10, delay: '0.8s' },
  { top: '84%', left: '10%', size: 11, delay: '1.6s' },
  { top: '90%', left: '88%', size: 14, delay: '0.4s' },
  { top: '50%', left: '96%', size: 9, delay: '2.1s' },
]

/** A screenshot framed in a soft window, with a holo glow and optional tilt. */
export function ShotFrame({
  src,
  alt,
  tag,
  tilt = false,
  glow = 0.34,
  chrome = true,
}: {
  src: string
  alt: string
  tag?: string
  tilt?: boolean
  glow?: number
  chrome?: boolean
}) {
  return (
    <div className={'relative w-full ' + (tilt ? '[perspective:1600px]' : '')}>
      <HoloGlow className="!inset-x-[-6%] !inset-y-[-5%]" opacity={glow} blur={64} />
      <div
        className={
          'relative overflow-hidden rounded-[18px] border border-line bg-surface p-2.5 elev-3 transition-transform duration-500 ease-out ' +
          (tilt ? '[transform:rotateY(-7deg)_rotateX(4deg)] hover:[transform:rotateY(-2deg)_rotateX(1deg)]' : '')
        }
      >
        {chrome && (
          <div className="flex items-center gap-2 px-2.5 py-2">
            <span className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-teal/70" />
            </span>
            {tag && (
              <span className="ml-2 truncate rounded-md border border-line bg-canvas px-3 py-1 text-[11px] text-ink-faint">
                {tag}
              </span>
            )}
          </div>
        )}
        <div className="overflow-hidden rounded-xl bg-canvas-deep">
          <AssetImage
            src={src}
            alt={alt}
            className="block w-full object-cover"
            fallback={
              <div className="flex aspect-[16/10] w-full items-center justify-center text-[13px] text-ink-faint">
                {alt}
              </div>
            }
          />
        </div>
      </div>
    </div>
  )
}

/** A line icon on a soft morphing colored blob — for editorial feature grids. */
export function BlobIcon({
  Icon,
  from,
  to,
  size = 96,
}: {
  Icon: typeof ArrowRight
  from: string
  to: string
  size?: number
}) {
  return (
    <div className="relative shrink-0" style={{ height: size, width: size }}>
      <Blob variant="side" morph from={from} to={to} className="absolute inset-0 h-full w-full" />
      <Icon className="absolute inset-0 m-auto h-[38%] w-[38%] text-white drop-shadow" strokeWidth={1.75} />
    </div>
  )
}

// Per-accent blob gradients for the hero shape.
const BLOB_COLORS: Record<Accent, [string, string]> = {
  indigo: ['#7c3aed', '#4c1d95'],
  violet: ['#a78bfa', '#6d28d9'],
  teal: ['#3a4150', '#171a21'],
  amber: ['#f59e0b', '#b45309'],
  rose: ['#fb7185', '#be123c'],
}

const HERO_SPARKS: Spark[] = [
  { top: '10%', left: '14%', size: 13, delay: '0s' },
  { top: '24%', left: '60%', size: 10, delay: '1s' },
  { top: '72%', left: '8%', size: 12, delay: '0.6s' },
  { top: '84%', left: '52%', size: 12, delay: '1.7s' },
  { top: '16%', left: '90%', size: 11, delay: '2s' },
]

/**
 * Per-feature hero — a giant colored blob (herodash) bleeding off the right
 * with the product shot floating on it, dark editorial copy on the left.
 */
export function FeatureHero({
  eyebrow,
  Icon,
  accent,
  title,
  titleAccent,
  sub,
  shot,
  flip = false,
  blobFrom,
  blobTo,
  backdrop = 'blob',
}: {
  eyebrow: string
  Icon: typeof ArrowRight
  accent: Accent
  title: string
  titleAccent: string
  sub: string
  shot: string
  flip?: boolean
  blobFrom?: string
  blobTo?: string
  /** Which hero backdrop shape(s) to wear — varies per page so heroes don't
   *  repeat. 'none' = clean hero; pass an array to layer shapes together. */
  backdrop?: HeroBackdrop | HeroBackdrop[]
}) {
  const [defFrom, defTo] = BLOB_COLORS[accent]
  const from = blobFrom ?? defFrom
  const to = blobTo ?? defTo
  return (
    <section className="relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-28">
      {/* Hero backdrop — per page: none (clean), a single shape, or several
         layered together. 'blob' / 'scene' / 'wave', or an array to combine. */}
      {(Array.isArray(backdrop) ? backdrop : [backdrop]).map((b, i) =>
        b === 'none' ? null : b === 'trader' ? (
          <img
            key={i}
            src="/blob-haikei-trader-mind.png"
            alt=""
            aria-hidden
            className={
              'blob-enter pointer-events-none absolute top-[40px] h-auto w-[74%] max-w-[860px] object-contain mix-blend-multiply md:top-0 ' +
              (flip ? 'left-[-16%]' : 'right-[-16%]')
            }
            style={{ transformOrigin: flip ? '25% 40%' : '75% 40%' }}
          />
        ) : b === 'scene' ? (
          <HeroScene key={i} from={from} to={to} flip={flip} />
        ) : b === 'wave' ? (
          <HeroWave key={i} from={from} to={to} flip={flip} />
        ) : (
          <div
            key={i}
            className={
              'pointer-events-none absolute top-[80px] h-[720px] w-[720px] md:top-[64px] md:h-[980px] md:w-[980px] ' +
              (flip ? 'left-[-48%] sm:left-[-40%] md:left-[-30%]' : 'right-[-48%] sm:right-[-40%] md:right-[-30%]')
            }
          >
            <Blob variant="hero" morph from={from} to={to} className="h-full w-full" />
            <Blob variant="hero" from={from} to={to} className="absolute inset-[-7%] -z-10 h-[114%] w-[114%] opacity-30" />
          </div>
        ),
      )}

      {/* Floating circles on the far side */}
      <span className={'float-slow pointer-events-none absolute top-[38%] h-8 w-8 rounded-full opacity-80 ' + (flip ? 'right-[3%]' : 'left-[3%]')} style={{ backgroundColor: from }} />
      <span className={'float-slower pointer-events-none absolute top-[58%] h-4 w-4 rounded-full opacity-40 ' + (flip ? 'right-[7%]' : 'left-[7%]')} style={{ backgroundColor: to }} />
      <span className={'float-slow pointer-events-none absolute bottom-[12%] h-12 w-12 rounded-full border opacity-25 ' + (flip ? 'right-[2%]' : 'left-[2%]')} style={{ borderColor: from }} />

      <div className="relative mx-auto grid max-w-[1240px] items-center gap-10 px-6 md:px-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-8">
        <div className={flip ? 'lg:order-2' : ''}>
          <span data-reveal className={'micro inline-flex items-center gap-2 font-semibold ' + ACCENT_TEXT[accent]}>
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
            {eyebrow}
          </span>
          <h1 data-animate="title" className="mt-5 font-display text-[clamp(2.1rem,5vw,3.9rem)] leading-[1.05] font-bold text-ink md:leading-[1.04]">
            {title} <span className={ACCENT_TEXT[accent]}>{titleAccent}</span>
          </h1>
          <p data-reveal className="mt-5 max-w-[460px] text-[16px] leading-[1.65] text-ink-mute md:mt-6 md:text-[16.5px]">
            {sub}
          </p>
          <div data-reveal className="mt-8 flex flex-col items-stretch gap-3 sm:mt-9 sm:flex-row sm:flex-wrap sm:items-center">
            <CTA href="/signup" className="w-full justify-center sm:w-auto">Start free</CTA>
            <CTA href="/pricing" variant="secondary" className="w-full justify-center sm:w-auto">See plans</CTA>
          </div>
        </div>

        <div data-reveal className={'relative ' + (flip ? 'lg:order-1' : '')}>
          <Sparkles points={HERO_SPARKS} color="#ffffff" />
          <ShotFrame src={shot} alt={eyebrow} tag={`Orca · ${eyebrow}`} tilt glow={0.12} />
        </div>
      </div>
    </section>
  )
}

// Wave crest (Haikei) — reused as the top/bottom edge of a tinted band.
const WAVE_D =
  'M0 418L21.5 420.3C43 422.7 86 427.3 128.8 421.5C171.7 415.7 214.3 399.3 257.2 403.2C300 407 343 431 385.8 433.8C428.7 436.7 471.3 418.3 514.2 425C557 431.7 600 463.3 642.8 483C685.7 502.7 728.3 510.3 771.2 492.2C814 474 857 430 878.5 408L900 386L900 601L878.5 601C857 601 814 601 771.2 601C728.3 601 685.7 601 642.8 601C600 601 557 601 514.2 601C471.3 601 428.7 601 385.8 601C343 601 300 601 257.2 601C214.3 601 171.7 601 128.8 601C86 601 43 601 21.5 601L0 601Z'

/**
 * A wave-bounded tinted band that sits BETWEEN sections — the page dips into a
 * soft lavender field (a calm thesis line, not a CTA) and flows back out.
 * Doubles as the visual breather that separates one section shape from the next.
 */
export function WaveBand({
  eyebrow,
  title,
  sub,
}: {
  eyebrow?: string
  title: ReactNode
  sub?: string
}) {
  const bg = '#f4effe'
  return (
    <section className="relative my-12 md:my-20">
      <svg viewBox="0 386 900 215" preserveAspectRatio="none" aria-hidden className="block h-[48px] w-full md:h-[84px]">
        <path d={WAVE_D} fill={bg} />
      </svg>
      <div
        style={{ background: bg }}
        className="relative px-6 py-14 text-center md:py-20"
      >
        {/* faint holographic wash inside the band */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(700px 220px at 50% 0%, rgba(124,58,237,0.10), transparent 65%)' }}
        />
        <div className="relative mx-auto max-w-[720px]">
          {eyebrow && <span data-reveal className="micro font-semibold text-violet">{eyebrow}</span>}
          <h2 data-animate="title" className="mt-3 font-display text-[clamp(1.7rem,3.2vw,2.6rem)] leading-[1.15] font-bold text-ink">
            {title}
          </h2>
          {sub && <p data-reveal className="mx-auto mt-5 max-w-[560px] text-[16px] leading-[1.65] text-ink-mute">{sub}</p>}
        </div>
      </div>
      <svg viewBox="0 386 900 215" preserveAspectRatio="none" aria-hidden className="block h-[48px] w-full [transform:scaleY(-1)] md:h-[84px]">
        <path d={WAVE_D} fill={bg} />
      </svg>
    </section>
  )
}

/** Centered statement that opens the body of a feature page. */
export function FeatureIntro({ children }: { children: ReactNode }) {
  return (
    <section className="mx-auto max-w-[820px] px-6 pt-28 pb-10 text-center md:px-10 md:pt-40">
      <h2 data-animate="title" className="font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.2] font-bold text-ink">
        {children}
      </h2>
      <div data-reveal className="mx-auto mt-7 h-px w-16 bg-line" />
    </section>
  )
}

/** Centered section header (eyebrow + headline + sub) — for grid-style blocks. */
export function FeatureSectionHead({
  eyebrow,
  accent,
  title,
  sub,
}: {
  eyebrow: string
  accent: Accent
  title: ReactNode
  sub?: string
}) {
  return (
    <div className="mx-auto max-w-[640px] text-center">
      <span className={'micro font-semibold ' + ACCENT_TEXT[accent]}>{eyebrow}</span>
      <h3 data-animate="title" className="mt-3 font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.15] font-bold text-ink">
        {title}
      </h3>
      <div data-reveal className={'mx-auto mt-5 h-[3px] w-10 rounded-full ' + ACCENT_RULE[accent]} />
      {sub && <p data-reveal className="mx-auto mt-6 max-w-[520px] text-[15.5px] leading-[1.65] text-ink-mute">{sub}</p>}
    </div>
  )
}

/** Alternating two-column feature block: copy on one side, visual on the other. */
export function FeatureRow({
  eyebrow,
  accent,
  title,
  body,
  bullets,
  cta,
  shot,
  shotTag,
  flip = false,
}: {
  eyebrow: string
  accent: Accent
  title: ReactNode
  body: string
  bullets?: string[]
  cta?: { label: string; href: string }
  shot: string
  shotTag?: string
  flip?: boolean
}) {
  const side = flip ? 'right' : 'left'
  return (
    <section className="relative overflow-hidden px-6 py-28 md:px-10 md:py-40">
      {/* gap decoration */}
      <Blob
        variant="side"
        morph
        className={
          'pointer-events-none absolute -z-10 h-[460px] w-[460px] opacity-[0.06] ' +
          (flip ? 'top-6 -left-24' : 'bottom-6 -right-24')
        }
      />
      <Sparkles points={GAP_SPARKS} color="rgba(124,58,237,0.5)" />
      <div className="mx-auto grid max-w-[1160px] items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Copy */}
        <div data-side={side} className={flip ? 'lg:order-2' : ''}>
          <span className={'micro font-semibold ' + ACCENT_TEXT[accent]}>{eyebrow}</span>
          <span className={'mt-3 block h-[3px] w-9 rounded-full ' + ACCENT_RULE[accent]} />
          <h3 className="mt-4 font-display text-[clamp(1.5rem,2.6vw,2.1rem)] leading-[1.15] font-bold text-ink">
            {title}
          </h3>
          <p className="mt-4 max-w-[480px] text-[15.5px] leading-[1.65] text-ink-mute">{body}</p>
          {bullets && (
            <ul className="mt-5 flex flex-col gap-2.5">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-[14.5px] text-ink">
                  <span className={'mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ' + ACCENT_RULE[accent]} />
                  {b}
                </li>
              ))}
            </ul>
          )}
          {cta && (
            <a
              href={cta.href}
              className={'group mt-7 inline-flex items-center gap-2 text-[14.5px] font-semibold ' + ACCENT_TEXT[accent]}
            >
              {cta.label}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.25} />
            </a>
          )}
        </div>

        {/* Visual */}
        <div data-side={flip ? 'left' : 'right'} className={flip ? 'lg:order-1' : ''}>
          <ShotFrame src={shot} alt={eyebrow} tag={shotTag} />
        </div>
      </div>
    </section>
  )
}
