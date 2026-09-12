import { useEffect } from 'react'
import type { StepProps } from '../first-run.types'
import { COPY } from '../first-run.copy'
import { cx } from '../components/ui'

/* A clearly-marked placeholder QR (SVG) — Lovable injects the real image. */
function QrPlaceholder({ src, alt }: { src?: string; alt: string }) {
  if (src) return <img src={src} alt={alt} className="h-40 w-40 rounded-lg border border-line object-cover" />
  return (
    <div className="relative h-40 w-40 rounded-lg border border-dashed border-indigo/40 bg-canvas-deep p-3" role="img" aria-label={alt}>
      <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
        {Array.from({ length: 100 }).map((_, i) => {
          const x = (i % 10) * 10, y = Math.floor(i / 10) * 10
          const on = [0, 1, 2, 3, 4, 6, 8, 9, 10, 14, 16, 19, 20, 24, 26, 28, 29, 33, 37, 40, 42, 45, 48, 51, 55, 58, 62, 66, 70, 71, 72, 76, 79, 80, 84, 88, 91, 95, 97, 99].includes((i * 7) % 100)
          return on ? <rect key={i} x={x + 1} y={y + 1} width="8" height="8" rx="1" fill="var(--color-ink)" opacity="0.72" /> : null
        })}
      </svg>
    </div>
  )
}

export function CommunityStep({ answers, update, onValidityChange, communityQrSrc }: StepProps) {
  const t = COPY.onboarding.community
  const valid = answers.communityMember !== null
  useEffect(() => { onValidityChange?.(valid) }, [valid, onValidityChange])

  const Card = ({ selected, onClick, title, sub }: { selected: boolean; onClick: () => void; title: string; sub: string }) => (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        'flex min-h-[64px] flex-1 items-center gap-3 rounded-xl border p-4 text-start transition-all',
        selected ? 'border-indigo bg-indigo-soft' : 'border-line bg-surface hover:border-indigo/40',
      )}
    >
      <span className={cx('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2', selected ? 'border-indigo bg-indigo' : 'border-line')}>
        {selected && <span className="h-2 w-2 rounded-full bg-white" />}
      </span>
      <span>
        <span className="block text-[14.5px] font-semibold text-ink">{title}</span>
        <span className="block text-[12.5px] text-ink-mute">{sub}</span>
      </span>
    </button>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Card selected={answers.communityMember === true} onClick={() => update({ communityMember: true })} title={t.member} sub={t.memberSub} />
        <Card selected={answers.communityMember === false} onClick={() => update({ communityMember: false })} title={t.not} sub={t.notSub} />
      </div>

      {answers.communityMember === true && (
        <div className="mt-1 flex flex-col items-center gap-3 rounded-xl border border-line bg-canvas-deep/60 p-5 text-center">
          <span className="text-[14px] font-semibold text-ink">{t.qrTitle}</span>
          <QrPlaceholder src={communityQrSrc} alt={t.qrTitle} />
          <span className="max-w-[260px] text-[12.5px] text-ink-mute">{t.qrNote}</span>
          {!communityQrSrc && <span className="rounded-full bg-amber-soft px-2.5 py-0.5 text-[11px] font-semibold text-amber">{t.placeholder}</span>}
        </div>
      )}
    </div>
  )
}
