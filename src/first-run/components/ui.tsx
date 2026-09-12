import { useEffect, useRef, type ReactNode } from 'react'
import type { Lang } from '../first-run.types'

/* ============================================================================
   Local UI kit for the first-run package — self-contained (no external deps),
   built on the project's cool-light / violet token classes so Lovable can remap
   them centrally. No hard-coded hex here; colors come from Tailwind tokens.
   ========================================================================== */

export function cx(...p: (string | false | null | undefined)[]) {
  return p.filter(Boolean).join(' ')
}

/* ── Spinner ─────────────────────────────────────────────────────────────── */
export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={cx('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/* ── Buttons ─────────────────────────────────────────────────────────────── */
type BtnProps = {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
  loading?: boolean
  className?: string
  full?: boolean
}
export function Button({ children, onClick, type = 'button', variant = 'primary', disabled, loading, className, full }: BtnProps) {
  const base =
    'relative inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-[14.5px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo/25 disabled:cursor-not-allowed min-h-[44px]'
  const styles =
    variant === 'primary'
      ? 'bg-indigo text-white shadow-[0_10px_24px_-8px_rgba(124,58,237,0.5)] hover:-translate-y-0.5 disabled:opacity-55 disabled:translate-y-0 disabled:shadow-none'
      : variant === 'secondary'
        ? 'border border-line bg-surface text-ink hover:border-indigo/45 disabled:opacity-55'
        : 'text-ink-mute hover:text-ink disabled:opacity-55'
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} aria-busy={loading || undefined} className={cx(base, styles, full && 'w-full', className)}>
      {loading && <Spinner />}
      <span className={cx(loading && 'opacity-90')}>{children}</span>
    </button>
  )
}

/* ── Text field with label + inline error (aria-describedby) ─────────────── */
export function TextField({
  id, label, value, onChange, placeholder, error, autoFocus, required,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void
  placeholder?: string; error?: string; autoFocus?: boolean; required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13.5px] font-semibold text-ink">
        {label}{required && <span className="text-indigo"> *</span>}
      </label>
      <input
        id={id}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        className={cx(
          'min-h-[48px] rounded-lg border bg-surface px-4 text-[15px] text-ink outline-none transition-colors placeholder:text-ink-faint',
          'focus:ring-4 focus:ring-indigo/15',
          error ? 'border-rose focus:border-rose' : 'border-line focus:border-indigo/60',
        )}
      />
      {error && (
        <span id={`${id}-err`} className="flex items-center gap-1.5 text-[12.5px] font-medium text-rose">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 8v5M12 16h.01M12 3l9 16H3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {error}
        </span>
      )}
    </div>
  )
}

/* ── Error / offline banner (aria-live, fixed slot — no layout jump) ─────── */
export function StatusBanner({ tone = 'error', children, onRetry, retryLabel }: { tone?: 'error' | 'info'; children: ReactNode; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cx(
        'flex items-start gap-2.5 rounded-lg border px-4 py-3 text-[13px] leading-snug',
        tone === 'error' ? 'border-rose/30 bg-rose-soft text-ink-2' : 'border-line bg-canvas-deep text-ink-2',
      )}
    >
      <svg className="mt-0.5 h-4 w-4 shrink-0 text-rose" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 8v5M12 16h.01M12 3l9 16H3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <span className="flex-1">{children}</span>
      {onRetry && (
        <button onClick={onRetry} className="shrink-0 rounded-md px-2 py-0.5 text-[12.5px] font-bold text-indigo hover:bg-indigo-soft">
          {retryLabel ?? 'Retry'}
        </button>
      )}
    </div>
  )
}

/* ── Brand mark ──────────────────────────────────────────────────────────── */
export function Brand({ logoSrc = '/orca-icon.png' }: { logoSrc?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src={logoSrc} alt="Orca Investment" className="h-8 w-8 rounded-full object-cover" />
      <span className="font-display text-[15px] font-bold tracking-[-0.01em] text-ink">Orca Investment</span>
    </div>
  )
}

/* ── Screen shell — centered card, RTL/LTR aware, moves focus to heading ─── */
export function ScreenShell({
  lang, title, subtitle, children, footer, wide, headingRef,
}: {
  lang: Lang
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
  headingRef?: React.RefObject<HTMLHeadingElement | null>
}) {
  const localRef = useRef<HTMLHeadingElement>(null)
  const ref = headingRef ?? localRef
  useEffect(() => {
    ref.current?.focus()
  }, [ref])
  return (
    <div dir={lang === 'he' ? 'rtl' : 'ltr'} className="relative flex min-h-[100dvh] w-full items-center justify-center px-5 py-10" style={{ background: 'radial-gradient(1100px 620px at 50% -8%, rgba(124,58,237,0.06), transparent 62%), var(--color-canvas)' }}>
      <div className={cx('relative w-full', wide ? 'max-w-[720px]' : 'max-w-[520px]')}>
        <div className="rounded-2xl border border-line bg-surface elev-2">
          <div className="p-7 md:p-9">
            <h1 ref={ref} tabIndex={-1} className="font-display text-[clamp(1.5rem,3vw,2rem)] leading-[1.12] font-bold text-ink outline-none">
              {title}
            </h1>
            {subtitle && <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-mute">{subtitle}</p>}
            <div className="mt-7">{children}</div>
          </div>
          {footer && <div className="border-t border-line px-7 py-5 md:px-9">{footer}</div>}
        </div>
      </div>
    </div>
  )
}
