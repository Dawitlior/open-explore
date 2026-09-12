import { useState, type ReactNode } from 'react'
import { useMagnetic } from '../../lib/use-premium-motion'

/* ============================================================================
   Shared surface vocabulary — warm editorial light. Cream canvas, charcoal
   ink, soft rounded cards, terracotta accent, near-black pill CTAs.
   ========================================================================== */

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

export type Accent = 'indigo' | 'teal' | 'rose' | 'amber' | 'violet'

export const ACCENT_TEXT: Record<Accent, string> = {
  indigo: 'text-indigo',
  teal: 'text-teal',
  rose: 'text-rose',
  amber: 'text-amber',
  violet: 'text-violet',
}

export const ACCENT_BG: Record<Accent, string> = {
  indigo: 'bg-indigo',
  teal: 'bg-teal',
  rose: 'bg-rose',
  amber: 'bg-amber',
  violet: 'bg-violet',
}

const ACCENT_TINT: Record<Accent, string> = {
  indigo: 'bg-indigo-soft text-indigo',
  teal: 'bg-teal-soft text-teal',
  rose: 'bg-rose-soft text-rose',
  amber: 'bg-amber-soft text-amber',
  violet: 'bg-violet-soft text-violet',
}

const ACCENT_HOVER: Record<Accent, string> = {
  indigo: 'hover:border-indigo/30',
  teal: 'hover:border-teal/30',
  rose: 'hover:border-rose/30',
  amber: 'hover:border-amber/30',
  violet: 'hover:border-violet/30',
}

const ACCENT_HEX: Record<Accent, string> = {
  indigo: '#7c3aed',
  teal: '#1a1d24',
  rose: '#e5484d',
  amber: '#e0a53a',
  violet: '#8b5cf6',
}

/* ── Holographic glow ─────────────────────────────────────────────────── */

/** The Rareblocks iridescent smear that sits behind a screenshot / card /
 *  band. Very subtle by default. Drop it as the first child of a `relative`
 *  container; it paints behind siblings and never intercepts pointer events. */
export function HoloGlow({
  className,
  opacity = 0.32,
  blur = 46,
  radius = '2rem',
}: {
  className?: string
  opacity?: number
  blur?: number
  radius?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={cn('holo holo-drift pointer-events-none absolute -z-10', className)}
      style={{
        inset: '-14%',
        opacity,
        filter: `blur(${blur}px)`,
        borderRadius: radius,
      }}
    />
  )
}

/* ── Card ─────────────────────────────────────────────────────────────── */

export function Card({
  children,
  className,
  accent = 'indigo',
  interactive = true,
}: {
  children: ReactNode
  className?: string
  accent?: Accent
  interactive?: boolean
}) {
  return (
    <div
      data-interactive={interactive ? '' : undefined}
      className={cn(
        'card transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
        interactive && 'hover:-translate-y-1 hover:elev-3',
        interactive && ACCENT_HOVER[accent],
        className,
      )}
    >
      {children}
    </div>
  )
}

/* ── Icon tile — the soft rounded square that holds a lucide glyph ─────── */

export function IconTile({ accent = 'indigo', children }: { accent?: Accent; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex h-11 w-11 items-center justify-center rounded-[14px]',
        ACCENT_TINT[accent],
      )}
    >
      {children}
    </span>
  )
}

/* ── Micro label ──────────────────────────────────────────────────────── */

export function SectionLabel({ children, accent = 'indigo' }: { children: ReactNode; accent?: Accent }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1',
        'micro',
        ACCENT_TEXT[accent],
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', ACCENT_BG[accent])} />
      {children}
    </span>
  )
}

/* ── Badge & pill ─────────────────────────────────────────────────────── */

export function Badge({
  children,
  accent = 'indigo',
  className,
}: {
  children: ReactNode
  accent?: Accent
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1',
        'micro',
        ACCENT_TINT[accent],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5',
        'text-[13px] font-medium text-ink-2 elev-1',
        'transition-all duration-300 hover:border-indigo/30 hover:text-ink',
        className,
      )}
    >
      {children}
    </span>
  )
}

/* ── CTA ──────────────────────────────────────────────────────────────── */

export function CTA({
  children,
  href = '#',
  variant = 'primary',
  className,
}: {
  children: ReactNode
  href?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  className?: string
}) {
  // Called unconditionally (rules of hooks); only the primary branch binds it.
  const magnet = useMagnetic<HTMLAnchorElement>(0.4)

  if (variant === 'ghost') {
    return (
      <a
        href={href}
        className={cn(
          'group inline-flex items-center gap-2 rounded-full px-4 py-3 text-[14.5px] font-semibold',
          'text-ink-mute transition-colors duration-300 hover:text-ink',
          className,
        )}
      >
        {children}
      </a>
    )
  }

  if (variant === 'secondary') {
    return (
      <a
        href={href}
        className={cn(
          'group inline-flex items-center gap-2 rounded-full border border-line bg-surface px-6 py-3.5',
          'text-[14.5px] font-semibold text-ink',
          'transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo/45 hover:elev-2',
          className,
        )}
      >
        {children}
      </a>
    )
  }

  // Primary: the reference's filled violet pill. White text, violet shadow, a
  // soft sheen sweep on hover. gsap owns the magnetic transform.
  return (
    <a
      ref={magnet}
      href={href}
      className={cn(
        'group relative inline-flex items-center gap-2 overflow-hidden rounded-full',
        'bg-indigo px-7 py-3.5',
        'text-[14.5px] font-semibold text-white',
        'shadow-[0_1px_0_0_rgba(255,255,255,0.18)_inset,0_10px_26px_-8px_rgba(124,58,237,0.5)]',
        'transition-shadow duration-300',
        'hover:shadow-[0_1px_0_0_rgba(255,255,255,0.25)_inset,0_14px_32px_-8px_rgba(124,58,237,0.6)]',
        className,
      )}
    >
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/12 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <span className="relative flex items-center gap-2">{children}</span>
    </a>
  )
}

/* ── Star rating (hero trust badge) ───────────────────────────────────── */

export function Stars({ count = 5 }: { count?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: count }, (_, i) => (
        <svg key={i} width="15" height="15" viewBox="0 0 24 24" fill="#cf9a3b" aria-hidden="true">
          <path d="M12 2l2.9 6.26L21.5 9l-5 4.6 1.4 6.9L12 17.1 6.1 20.5l1.4-6.9-5-4.6 6.6-.74L12 2z" />
        </svg>
      ))}
    </span>
  )
}

/* ── Score ring ───────────────────────────────────────────────────────── */

export function ScoreRing({
  value,
  label,
  accent = 'indigo',
  size = 92,
}: {
  value: number
  label?: string
  accent?: Accent
  size?: number
}) {
  const stroke = 7
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const arc = circumference * 0.75
  const filled = arc * (value / 100)

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-[225deg]"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#e7dcca"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circumference}`}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={ACCENT_HEX[accent]}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
          />
        </svg>
        <span className="tnum absolute inset-0 flex items-center justify-center text-[22px] font-bold text-ink">
          {value}
        </span>
      </div>
      {label && <span className="micro text-ink-faint">{label}</span>}
    </div>
  )
}

/* ── Section shell ────────────────────────────────────────────────────── */

export function Section({
  id,
  children,
  className,
  minH = '',
}: {
  id: string
  children: ReactNode
  className?: string
  minH?: string
}) {
  return (
    <section
      id={id}
      className={cn(
        'relative mx-auto w-full max-w-[1200px] px-6 md:px-10',
        minH,
        className,
      )}
    >
      {children}
    </section>
  )
}

/* ── Centered section header (Humanto's section intros) ───────────────── */

export function SectionHead({
  label,
  title,
  lede,
  accent = 'indigo',
  className,
}: {
  label?: string
  title: ReactNode
  lede?: ReactNode
  accent?: Accent
  className?: string
}) {
  return (
    <div className={cn('mx-auto max-w-[720px] text-center', className)}>
      {label && (
        <div data-reveal className="mb-5">
          <SectionLabel accent={accent}>{label}</SectionLabel>
        </div>
      )}
      <h2
        data-animate="title"
        className="font-display text-[clamp(1.9rem,4vw,3rem)] leading-[1.08] font-bold text-ink"
      >
        {title}
      </h2>
      {lede && (
        <p data-reveal className="mx-auto mt-5 max-w-[560px] text-[16.5px] leading-[1.6] text-ink-mute">
          {lede}
        </p>
      )}
    </div>
  )
}

/* ── Headline / Lede ──────────────────────────────────────────────────── */

export function Headline({
  children,
  className,
  size = 'lg',
}: {
  children: ReactNode
  className?: string
  size?: 'lg' | 'xl'
}) {
  return (
    <h2
      data-animate="title"
      className={cn(
        'font-display font-bold text-ink',
        size === 'xl'
          ? 'text-[clamp(2.6rem,6vw,4.6rem)] leading-[1.02]'
          : 'text-[clamp(1.9rem,4vw,3rem)] leading-[1.08]',
        className,
      )}
    >
      {children}
    </h2>
  )
}

export function Lede({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('text-[16.5px] leading-[1.65] text-ink-mute', className)}>{children}</p>
  )
}

/* ── Asset image with fallback ────────────────────────────────────────── */

/** Renders a real asset (e.g. /dashboard.png in public/) once it exists; until
 *  then — or if it fails to load — it shows the fallback node. Lets us wire the
 *  layout now and drop the real screenshot/GIF in later with zero code change. */
export function AssetImage({
  src,
  alt,
  className,
  fallback,
}: {
  src: string
  alt: string
  className?: string
  fallback: ReactNode
}) {
  const [broken, setBroken] = useState(false)
  const [loaded, setLoaded] = useState(false)
  if (broken) return <>{fallback}</>
  // Blur-up: a soft canvas-deep placeholder fills the box, then the image
  // de-blurs and fades in on load — so a slow asset never looks "stuck".
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setBroken(true)}
      className={cn(
        className,
        'transition-[filter,opacity] duration-700 ease-out',
        loaded ? 'opacity-100 blur-0' : 'opacity-60 blur-[10px]',
      )}
      style={loaded ? undefined : { background: 'var(--color-canvas-deep)' }}
    />
  )
}

/* ── Browser frame ────────────────────────────────────────────────────── */

/** A real product screen, straight, inside light window chrome. The dark app
 *  screen sits on a slim dark inset so the light title bar and the dark screen
 *  read as one device — never rotated, never overlapping. */
export function BrowserFrame({ url = '', children }: { url?: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface elev-3">
      <div className="flex items-center gap-2 border-b border-line bg-canvas-deep px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-teal/70" />
        </span>
        <span className="tnum ml-2 truncate rounded-md border border-line bg-surface px-3 py-1 text-[11px] text-ink-faint">
          app.orcainvestment.com{url}
        </span>
      </div>
      <div className="flex justify-center overflow-x-auto bg-[#0f131b] p-4">{children}</div>
    </div>
  )
}
